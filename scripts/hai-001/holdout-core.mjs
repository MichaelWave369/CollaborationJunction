/**
 * HAI-001 offline holdout commitment primitives.
 * Data-only processing. No execution of candidate code or arbitrary imports.
 * A commitment binds exact bytes; it does not authenticate a human or study.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
export const CASE_SCHEMA="CJ-HAI001-HOLDOUT-CASES-v1";
export const COMMIT_SCHEMA="CJ-HAI001-HOLDOUT-COMMIT-v1";
export const SECRET_SCHEMA="CJ-HAI001-HOLDOUT-SECRET-v1";
const SHA=/^[a-f0-9]{64}$/;
const ID=/^HOLDOUT_[A-Z0-9_-]{3,40}$/;
const ACCEPT_ID=/^[A-Z0-9_-]{5,80}$/;
const LIMIT=1024*1024;
const domain="CJ_HAI001_HOLDOUT_COMMIT_V1\0";
export const sha256=data=>createHash("sha256").update(data).digest("hex");
function equalDigest(a,b){if(!SHA.test(a)||!SHA.test(b))return false;return timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));}
function ensureShape(object,fields,label){
 assert.ok(object&&typeof object==="object"&&!Array.isArray(object),label+" must be an object");
 assert.deepEqual(Object.keys(object).sort(),fields.slice().sort(),label+" fields invalid");
}
function boundedJson(value,depth=0,state={n:0}){
 state.n++;
 assert.ok(state.n<=2000&&depth<=20,"Holdout JSON exceeded 2,000 values or 20 levels");
 if(value===null||typeof value==="boolean")return;
 if(typeof value==="string"){assert.ok(value.length<=5000,"Holdout string too long");return;}
 if(typeof value==="number"){assert.ok(Number.isFinite(value),"Holdout number not finite");return;}
 if(Array.isArray(value)){for(const v of value)boundedJson(v,depth+1,state);return;}
 assert.ok(typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype,"Holdout value must be plain JSON");
 for(const [key,v] of Object.entries(value)){
  assert.ok(key.length<=100,"Holdout object key too long");
  boundedJson(v,depth+1,state);
 }
}
export function validateChallenge(raw,fixtures,lock){
 assert.ok(Buffer.isBuffer(raw),"Holdout must be raw file bytes");
 assert.ok(raw.byteLength<=LIMIT,"Holdout exceeds 1 MiB");
 assert.ok(lock&&SHA.test(lock.pack_sha256),"Frozen pack lock missing");
 let challenge;
 try{challenge=JSON.parse(raw.toString("utf8"));}
 catch{throw Error("Invalid holdout JSON");}
 ensureShape(challenge,["schema","protocol","task_pack_sha256","task_id","case_set_id","cases"],"Challenge");
 assert.equal(challenge.schema,CASE_SCHEMA);
 assert.equal(challenge.protocol,"HAI-001");
 assert.equal(challenge.task_pack_sha256,lock.pack_sha256,"Holdout does not match frozen protocol");
 assert.match(challenge.case_set_id,ID);
 assert.ok(Array.isArray(fixtures?.groups),"Frozen public cases missing");
 const publicGroup=fixtures.groups.find(g=>g.task_id===challenge.task_id);
 assert.ok(publicGroup,"Unknown task ID");
 assert.ok(Array.isArray(challenge.cases)&&challenge.cases.length>=3&&challenge.cases.length<=50,"Require 3–50 holdout cases");
 const ids=new Set();
 for(const item of challenge.cases){
  ensureShape(item,["case_id","input","expected"],"Holdout case");
  assert.ok(typeof item.case_id==="string"&&ACCEPT_ID.test(item.case_id)&&item.case_id.startsWith(challenge.case_set_id+"-"),"Invalid holdout case ID");
  assert.ok(!ids.has(item.case_id),"Duplicate case ID");
  ids.add(item.case_id);
  boundedJson(item.input); boundedJson(item.expected);
  assert.ok(!publicGroup.cases.some(x=>isDeepStrictEqual(x.input,item.input)),"Holdout input duplicates a public practice input");
 }
 // Duplicate holdout inputs could allow a misleading case-count inflation.
 for(let i=0;i<challenge.cases.length;i++){
  for(let j=i+1;j<challenge.cases.length;j++)assert.ok(!isDeepStrictEqual(challenge.cases[i].input,challenge.cases[j].input),"Repeated holdout input");
 }
 return challenge;
}
function commitmentDigest(raw,nonceHex) {
 assert.match(nonceHex,SHA,"Nonce requires 32 cryptographically random bytes");
 return createHash("sha256").update(domain,"utf8").update(nonceHex,"ascii").update("\0","utf8").update(raw).digest("hex");
}
export function sealChallenge(raw,fixtures,lock,nonceHex=randomBytes(32).toString("hex")){
 const challenge=validateChallenge(raw,fixtures,lock);
 const digest=commitmentDigest(raw,nonceHex);
 const publicCommitment={
  schema:COMMIT_SCHEMA,protocol:"HAI-001",task_pack_sha256:lock.pack_sha256,
  task_id:challenge.task_id,case_set_id:challenge.case_set_id,
  case_count:challenge.cases.length,algorithm:"SHA-256",
  commitment_sha256:digest,status:"SEALED_NOT_EVALUATED",
  note:"Commitment binds private exact bytes and secret random nonce. No answers, cases, or nonce are in this file. Publication before trials must be verified externally."
 };
 const privateSecret={
  schema:SECRET_SCHEMA,nonce_hex:nonceHex,
  holdout_file_sha256:sha256(raw),
  commitment_sha256:digest
 };
 return {publicCommitment,privateSecret};
}
export function verifyReveal(raw,publicCommitment,privateSecret,fixtures,lock){
 const challenge=validateChallenge(raw,fixtures,lock);
 ensureShape(publicCommitment,["schema","protocol","task_pack_sha256","task_id","case_set_id","case_count","algorithm","commitment_sha256","status","note"],"Public commitment");
 ensureShape(privateSecret,["schema","nonce_hex","holdout_file_sha256","commitment_sha256"],"Secret");
 assert.equal(publicCommitment.schema,COMMIT_SCHEMA);
 assert.equal(privateSecret.schema,SECRET_SCHEMA);
 assert.equal(publicCommitment.protocol,"HAI-001");
 assert.equal(publicCommitment.algorithm,"SHA-256");
 assert.equal(publicCommitment.status,"SEALED_NOT_EVALUATED");
 assert.equal(publicCommitment.task_pack_sha256,lock.pack_sha256);
 assert.equal(publicCommitment.task_id,challenge.task_id);
 assert.equal(publicCommitment.case_set_id,challenge.case_set_id);
 assert.equal(publicCommitment.case_count,challenge.cases.length);
 assert.ok(equalDigest(privateSecret.holdout_file_sha256,sha256(raw)),"Holdout file changed");
 const digest=commitmentDigest(raw,privateSecret.nonce_hex);
 assert.ok(equalDigest(publicCommitment.commitment_sha256,digest),"Commitment doesn't match revealed private file");
 assert.ok(equalDigest(privateSecret.commitment_sha256,digest),"Secret metadata doesn't match commitment");
 return {
  status:"REVEAL_BYTES_VERIFIED",protocol:"HAI-001",task_id:challenge.task_id,
  case_set_id:challenge.case_set_id,case_count:challenge.cases.length,
  commitment_sha256:digest,
  warning:"Cryptographic binding verified. Not proof the seal predated trials, that hidden cases were independent, that outputs were computed by genuine candidates, or that observations are authentic."
 };
}
