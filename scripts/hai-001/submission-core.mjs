/**
 * HAI-001 source submission custody (NO EXECUTION).
 *
 * Binds exact source + self-reported metadata to a prior public holdout commitment.
 * A digest is tamper evidence, NOT a timestamp, identity proof, consent check,
 * authorship proof, independent observation, or functional test.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { TextDecoder } from "node:util";
import assert from "node:assert/strict";
export const META_SCHEMA="CJ-HAI001-SUBMISSION-METADATA-v1";
export const PUBLIC_SCHEMA="CJ-HAI001-SUBMISSION-COMMIT-v1";
export const PRIVATE_SCHEMA="CJ-HAI001-SUBMISSION-SECRET-v1";
const HOLDOUT_SCHEMA="CJ-HAI001-HOLDOUT-COMMIT-v1";
const SHA=/^[a-f0-9]{64}$/;
const TRIAL=/^TRIAL_[A-Z0-9_-]{4,64}$/;
const TASK=/^HAI-001-T(0[1-9]|1[0-2])$/;
const CHALLENGE=/^HOLDOUT_[A-Z0-9_-]{3,40}$/;
const MAX_SOURCE=65536,MAX_META=8192;
const domain="CJ_HAI001_SOURCE_CUSTODY_V1\0";
export const sha256=value=>createHash("sha256").update(value).digest("hex");
function keysExact(value,keys,who) {
 assert.ok(value&&typeof value==="object"&&!Array.isArray(value),who+" must be an object");
 assert.deepEqual(Object.keys(value).sort(),keys.slice().sort(),who+" fields must be exact");
}
function digestEqual(a,b) {
 return typeof a==="string"&&typeof b==="string"&&SHA.test(a)&&SHA.test(b)&&timingSafeEqual(Buffer.from(a,"hex"),Buffer.from(b,"hex"));
}
function parseBounded(buffer,max,label){
 assert.ok(Buffer.isBuffer(buffer),label+" must be raw bytes");
 assert.ok(buffer.length>0&&buffer.length<=max,label+" byte limit exceeded");
 let text;
 try{text=new TextDecoder("utf-8",{fatal:true}).decode(buffer);}
 catch{throw Error(label+" is not valid UTF-8");}
 return text;
}
export function validateMetadata(rawMeta,rawSource,holdout,lock){
 const metaText=parseBounded(rawMeta,MAX_META,"Metadata");
 const sourceText=parseBounded(rawSource,MAX_SOURCE,"Source");
 assert.ok(sourceText.trim(),"Empty source cannot be submitted");
 let meta;
 try{meta=JSON.parse(metaText);}catch{throw Error("Metadata must be valid JSON");}
 keysExact(meta,["schema","protocol","task_pack_sha256","task_id","trial_id","condition","tool_class","declared_origin","holdout_commitment_sha256"],"Submission metadata");
 assert.equal(meta.schema,META_SCHEMA);
 assert.equal(meta.protocol,"HAI-001");
 assert.ok(lock&&SHA.test(lock.pack_sha256),"Frozen pack lock missing");
 assert.equal(meta.task_pack_sha256,lock.pack_sha256);
 assert.match(meta.task_id,TASK);
 assert.match(meta.trial_id,TRIAL);
 assert.ok(["A","B","C","D"].includes(meta.condition),"Unregistered condition");
 const validTools={A:"NONE",B:"LOCAL_MODEL",C:"CLOUD_MODEL",D:"MODEL_FIRST"};
 assert.equal(meta.tool_class,validTools[meta.condition],"Declared tool class conflicts with condition");
 assert.ok(["SYNTHETIC","SELF_REPORTED"].includes(meta.declared_origin),"Origin must be SYNTHETIC or SELF_REPORTED");
 keysExact(holdout,["schema","protocol","task_pack_sha256","task_id","case_set_id","case_count","algorithm","commitment_sha256","status","note"],"Holdout commitment");
 assert.equal(holdout.schema,HOLDOUT_SCHEMA);
 assert.equal(holdout.protocol,"HAI-001");
 assert.equal(holdout.task_pack_sha256,lock.pack_sha256,"Holdout pack mismatch");
 assert.equal(holdout.task_id,meta.task_id,"Holdout task mismatch");
 assert.match(holdout.case_set_id,CHALLENGE);
 assert.ok(Number.isInteger(holdout.case_count)&&holdout.case_count>=3&&holdout.case_count<=50,"Holdout case count invalid");
 assert.equal(holdout.algorithm,"SHA-256");
 assert.equal(holdout.status,"SEALED_NOT_EVALUATED");
 assert.ok(SHA.test(holdout.commitment_sha256),"Invalid holdout commitment");
 assert.equal(meta.holdout_commitment_sha256,holdout.commitment_sha256,"Holdout digest mismatch");
 return meta;
}
function computeDigest(sourceHash,metaHash,nonceHex){
 assert.match(nonceHex,SHA,"Nonce must be 32 random bytes (64 hexadecimal characters)");
 assert.match(sourceHash,SHA);
 assert.match(metaHash,SHA);
 return createHash("sha256").update(domain,"utf8").update(nonceHex,"ascii").update("\0","utf8")
   .update(metaHash,"ascii").update("\0","utf8").update(sourceHash,"ascii").digest("hex");
}
export function sealSubmission(rawSource,rawMeta,holdout,lock,nonceHex=randomBytes(32).toString("hex")){
 const metadata=validateMetadata(rawMeta,rawSource,holdout,lock);
 const sourceHash=sha256(rawSource),metaHash=sha256(rawMeta);
 const commitment=computeDigest(sourceHash,metaHash,nonceHex);
 const publicCommitment={
  schema:PUBLIC_SCHEMA,protocol:"HAI-001",task_pack_sha256:lock.pack_sha256,
  task_id:metadata.task_id,trial_id:metadata.trial_id,
  condition:metadata.condition,tool_class:metadata.tool_class,declared_origin:metadata.declared_origin,
  holdout_commitment_sha256:holdout.commitment_sha256,
  algorithm:"SHA-256",commitment_sha256:commitment,
  status:"SUBMISSION_BYTES_COMMITTED_UNVERIFIED",
  note:"Exact private source and metadata are nonce-bound, but authorship, timing, compliance and execution are NOT verified."
 };
 const privateSecret={
  schema:PRIVATE_SCHEMA,nonce_hex:nonceHex,source_file_sha256:sourceHash,
  metadata_file_sha256:metaHash,commitment_sha256:commitment
 };
 return {publicCommitment,privateSecret};
}
export function verifySubmission(rawSource,rawMeta,holdout,publicCommitment,privateSecret,lock){
 const metadata=validateMetadata(rawMeta,rawSource,holdout,lock);
 keysExact(publicCommitment,["schema","protocol","task_pack_sha256","task_id","trial_id","condition","tool_class","declared_origin","holdout_commitment_sha256","algorithm","commitment_sha256","status","note"],"Public submission commitment");
 keysExact(privateSecret,["schema","nonce_hex","source_file_sha256","metadata_file_sha256","commitment_sha256"],"Private submission secret");
 assert.equal(publicCommitment.schema,PUBLIC_SCHEMA);
 assert.equal(privateSecret.schema,PRIVATE_SCHEMA);
 assert.equal(publicCommitment.protocol,"HAI-001");
 assert.equal(publicCommitment.task_pack_sha256,lock.pack_sha256);
 assert.equal(publicCommitment.task_id,metadata.task_id);
 assert.equal(publicCommitment.trial_id,metadata.trial_id);
 assert.equal(publicCommitment.condition,metadata.condition);
 assert.equal(publicCommitment.tool_class,metadata.tool_class);
 assert.equal(publicCommitment.declared_origin,metadata.declared_origin);
 assert.equal(publicCommitment.holdout_commitment_sha256,holdout.commitment_sha256);
 assert.equal(publicCommitment.algorithm,"SHA-256");
 assert.equal(publicCommitment.status,"SUBMISSION_BYTES_COMMITTED_UNVERIFIED");
 const sourceHash=sha256(rawSource),metaHash=sha256(rawMeta);
 assert.ok(digestEqual(privateSecret.source_file_sha256,sourceHash),"Source bytes changed");
 assert.ok(digestEqual(privateSecret.metadata_file_sha256,metaHash),"Metadata bytes changed");
 const calculated=computeDigest(sourceHash,metaHash,privateSecret.nonce_hex);
 assert.ok(digestEqual(publicCommitment.commitment_sha256,calculated),"Public source commitment mismatch");
 assert.ok(digestEqual(privateSecret.commitment_sha256,calculated),"Private custody metadata mismatch");
 return {
  status:"SUBMISSION_BYTES_VERIFIED_ONLY",task_id:metadata.task_id,
  trial_id:metadata.trial_id,condition:metadata.condition,
  holdout_commitment_sha256:holdout.commitment_sha256,
  commitment_sha256:calculated,
  code_executed:false,study_result:false,independent_witness_verified:false,
  warning:"Private files match the commitment. No execution, chronology, authorship, tool-use compliance, independent witness, or scientific outcome was established."
 };
}
