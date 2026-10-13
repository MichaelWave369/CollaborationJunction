import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {verifyLock,PACK_DIR} from "../scripts/hai-001/verify-lock.mjs";
import {sealChallenge} from "../scripts/hai-001/holdout-core.mjs";
import {sealSubmission,verifySubmission} from "../scripts/hai-001/submission-core.mjs";
import {handle} from "../scripts/hai-001/submission.mjs";

const lock=verifyLock();
const publicCases=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
const syntheticHoldout=readFileSync(new URL("../examples/hai-001-synthetic-challenge.json",import.meta.url));
const holdout=sealChallenge(syntheticHoldout,publicCases,lock,"12".repeat(32)).publicCommitment;
const source=Buffer.from('export function solve(input) { return input.tags.map(s => s.trim().toLowerCase()); }\n');
const meta=()=>({
 schema:"CJ-HAI001-SUBMISSION-METADATA-v1",protocol:"HAI-001",task_pack_sha256:lock.pack_sha256,
 task_id:"HAI-001-T01",trial_id:"TRIAL_SYNTHETIC_0001",condition:"A",tool_class:"NONE",
 declared_origin:"SYNTHETIC",holdout_commitment_sha256:holdout.commitment_sha256
});
const metaBytes=(v=meta())=>Buffer.from(JSON.stringify(v,null,2)+"\n");
const nonce="ab".repeat(32);
test("synthetic submission bytes are bound to preexisting holdout commitment",()=>{
 const {publicCommitment,privateSecret}=sealSubmission(source,metaBytes(),holdout,lock,nonce);
 assert.equal(publicCommitment.status,"SUBMISSION_BYTES_COMMITTED_UNVERIFIED");
 assert.equal(publicCommitment.holdout_commitment_sha256,holdout.commitment_sha256);
 assert.ok(!JSON.stringify(publicCommitment).includes("export function"));
 assert.ok(!JSON.stringify(publicCommitment).includes(nonce));
 const result=verifySubmission(source,metaBytes(),holdout,publicCommitment,privateSecret,lock);
 assert.equal(result.status,"SUBMISSION_BYTES_VERIFIED_ONLY");
 assert.equal(result.code_executed,false);
 assert.equal(result.study_result,false);
});
test("changing private code, private metadata, nonce or public metadata breaks commitment",()=>{
 const {publicCommitment,privateSecret}=sealSubmission(source,metaBytes(),holdout,lock,nonce);
 const base=(s,m=metaBytes(),p=publicCommitment,sec=privateSecret,h=holdout,l=lock)=>verifySubmission(s,m,h,p,sec,l);
 assert.throws(()=>base(Buffer.from(source.toString()+" //edit\n")));
 assert.throws(()=>base(source,Buffer.from(JSON.stringify(meta()))));
 assert.throws(()=>base(source,metaBytes(),publicCommitment,{...privateSecret,nonce_hex:"bb".repeat(32)}));
 assert.throws(()=>base(source,metaBytes(),{...publicCommitment,trial_id:"TRIAL_CHANGED"}));
 assert.throws(()=>base(source,metaBytes(),publicCommitment,privateSecret,{...holdout,commitment_sha256:"0".repeat(64)}));
 assert.throws(()=>base(source,metaBytes(),publicCommitment,privateSecret,holdout,{...lock,pack_sha256:"0".repeat(64)}));
});
test("reject mismatched task, unsupported mode, nonanonymous trial, bad UTF8 and invalid source size",()=>{
 const m=meta();
 for(const bad of [{...m,condition:"B"},{...m,trial_id:"Mike@internet.example"},{...m,holdout_commitment_sha256:"0".repeat(64)},
   {...m,task_id:"HAI-001-T02"},{...m,model_name:"private"}]){
   assert.throws(()=>sealSubmission(source,metaBytes(bad),holdout,lock,nonce));
 }
 assert.throws(()=>sealSubmission(Buffer.from([0xff,0xfe]),metaBytes(),holdout,lock,nonce));
 assert.throws(()=>sealSubmission(Buffer.alloc(0),metaBytes(),holdout,lock,nonce));
 assert.throws(()=>sealSubmission(Buffer.alloc(65537,97),metaBytes(),holdout,lock,nonce));
});
test("actual CLI can seal only in temporary external paths, then verify",()=>{
 const dir=mkdtempSync(join(tmpdir(),"cj-custody-"));
 try{
  const s=join(dir,"source.js"),m=join(dir,"metadata.json"),h=join(dir,"holdout.json"),p=join(dir,"public.json"),n=join(dir,"nonce.json");
  writeFileSync(s,source);writeFileSync(m,metaBytes());writeFileSync(h,JSON.stringify(holdout));
  const result=handle(["seal",s,m,h,p,n]);
  assert.equal(result.status,"SUBMISSION_BYTES_COMMITTED_UNVERIFIED");
  assert.ok(existsSync(p)&&existsSync(n));
  assert.throws(()=>handle(["seal",s,m,h,p,n]));
  assert.equal(handle(["verify",s,m,h,p,n]).status,"SUBMISSION_BYTES_VERIFIED_ONLY");
  writeFileSync(s,"tampered code");
  assert.throws(()=>handle(["verify",s,m,h,p,n]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("CLI refuses private source in public repo",()=>{
 const dir=mkdtempSync(join(tmpdir(),"cj-custody-guard-"));
 try{
  const m=join(dir,"metadata.json"),h=join(dir,"holdout.json"),p=join(dir,"public.json"),n=join(dir,"nonce.json");
  writeFileSync(m,metaBytes());writeFileSync(h,JSON.stringify(holdout));
  assert.throws(()=>handle(["seal",fileURLToPath(new URL("../site/calibration/score-core.mjs",import.meta.url)),m,h,p,n]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("no executor, browser upload, or untrusted process launcher is imported",()=>{
 const cli=readFileSync(new URL("../scripts/hai-001/submission.mjs",import.meta.url),"utf8");
 const core=readFileSync(new URL("../scripts/hai-001/submission-core.mjs",import.meta.url),"utf8");
 for(const content of [cli,core]){
  assert.doesNotMatch(content,/from ["']node:child_process["']/);
  assert.doesNotMatch(content,/\bexecSync\s*\(/);
  assert.doesNotMatch(content,/\bspawn\s*\(/);
  assert.doesNotMatch(content,/\beval\s*\(/);
 }
});
