import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLock,PACK_DIR } from "../scripts/hai-001/verify-lock.mjs";
import { sealChallenge,verifyReveal,validateChallenge } from "../scripts/hai-001/holdout-core.mjs";
import { handle } from "../scripts/hai-001/holdout.mjs";

const lock=verifyLock();
const fixtures=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
const synthetic=readFileSync(new URL("../examples/hai-001-synthetic-challenge.json",import.meta.url));
const nonce="cd".repeat(32);
const parse=b=>JSON.parse(b.toString("utf8"));
const modified=(fn)=>{const x=parse(synthetic);fn(x);return Buffer.from(JSON.stringify(x));};
test("synthetic challenge has three unique nonpublic inputs",()=>{
 const x=validateChallenge(synthetic,fixtures,lock);
 assert.equal(x.cases.length,3);
 assert.equal(x.task_id,"HAI-001-T01");
});
test("commitment contains no nonce, raw inputs or expected outputs",()=>{
 const {publicCommitment,privateSecret}=sealChallenge(synthetic,fixtures,lock,nonce);
 const publicText=JSON.stringify(publicCommitment);
 assert.equal(publicCommitment.status,"SEALED_NOT_EVALUATED");
 assert.equal(publicCommitment.commitment_sha256.length,64);
 assert.ok(!publicText.includes(nonce));
 assert.ok(!publicText.includes("Fresh  Item"));
 assert.ok(!publicText.includes("fresh-item"));
 assert.equal(privateSecret.nonce_hex,nonce);
 const v=verifyReveal(synthetic,publicCommitment,privateSecret,fixtures,lock);
 assert.equal(v.status,"REVEAL_BYTES_VERIFIED");
});
test("changing case data, nonce, public metadata, or frozen lock fails reveal",()=>{
 const {publicCommitment,privateSecret}=sealChallenge(synthetic,fixtures,lock,nonce);
 const tampered=modified(x=>{x.cases[0].expected=["wrong"];});
 assert.throws(()=>verifyReveal(tampered,publicCommitment,privateSecret,fixtures,lock));
 assert.throws(()=>verifyReveal(synthetic,publicCommitment,{...privateSecret,nonce_hex:"ab".repeat(32)},fixtures,lock));
 assert.throws(()=>verifyReveal(synthetic,{...publicCommitment,case_count:9},privateSecret,fixtures,lock));
 assert.throws(()=>verifyReveal(synthetic,publicCommitment,privateSecret,fixtures,{...lock,pack_sha256:"0".repeat(64)}));
});
test("malformed, duplicate, and public-practice holdouts rejected",()=>{
 assert.throws(()=>validateChallenge(modified(x=>{x.cases[1].case_id=x.cases[0].case_id}),fixtures,lock));
 assert.throws(()=>validateChallenge(modified(x=>{x.cases[1].input=x.cases[0].input}),fixtures,lock));
 assert.throws(()=>validateChallenge(modified(x=>{x.cases[0].input=fixtures.groups[0].cases[0].input}),fixtures,lock));
 assert.throws(()=>validateChallenge(modified(x=>{x.cases=x.cases.slice(0,2)}),fixtures,lock));
 assert.throws(()=>validateChallenge(modified(x=>{x.task_id="HAI-001-NOPE"}),fixtures,lock));
});
test("offline CLI seals and verifies only outside-repo private paths",()=>{
 const dir=mkdtempSync(join(tmpdir(),"cj-holdout-test-"));
 try{
  const source=join(dir,"private-cases.json"),pub=join(dir,"public-commitment.json"),secret=join(dir,"secret.json");
  writeFileSync(source,synthetic);
  const committed=handle(["commit",source,pub,secret]);
  assert.equal(committed.status,"SEALED_NOT_EVALUATED");
  assert.equal(existsSync(pub),true);
  assert.equal(existsSync(secret),true);
  assert.throws(()=>handle(["commit",source,pub,secret]));
  const verified=handle(["verify",source,pub,secret]);
  assert.equal(verified.status,"REVEAL_BYTES_VERIFIED");
  const badRaw=modified(x=>{x.cases[0].expected=["altered"];});
  writeFileSync(source,badRaw);
  assert.throws(()=>handle(["verify",source,pub,secret]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("private challenge inside repository cannot be used to seal",()=>{
 const dir=mkdtempSync(join(tmpdir(),"cj-holdout-guard-"));
 try{
  assert.throws(()=>handle(["commit",fileURLToPath(new URL("../examples/hai-001-synthetic-challenge.json",import.meta.url)),join(dir,"public.json"),join(dir,"secret.json")]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
