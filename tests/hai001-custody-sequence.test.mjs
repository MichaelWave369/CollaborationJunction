import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {verifyLock,PACK_DIR} from "../scripts/hai-001/verify-lock.mjs";
import {sealChallenge} from "../scripts/hai-001/holdout-core.mjs";
import {sealSubmission} from "../scripts/hai-001/submission-core.mjs";
import {inspectSequence} from "../scripts/hai-001/custody-sequence-core.mjs";
import {inspectFiles} from "../scripts/hai-001/custody-sequence.mjs";
const frozen=verifyLock();
const fixture=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
const challenge=readFileSync(new URL("../examples/hai-001-synthetic-challenge.json",import.meta.url));
const holdout=sealChallenge(challenge,fixture,frozen,"12".repeat(32)).publicCommitment;
const src=Buffer.from('export const solve = (input) => input.tags;\n');
const metadata=Buffer.from(JSON.stringify({
 schema:"CJ-HAI001-SUBMISSION-METADATA-v1",protocol:"HAI-001",
 task_pack_sha256:frozen.pack_sha256,task_id:holdout.task_id,
 trial_id:"TRIAL_SYNTHETIC_0001",condition:"A",tool_class:"NONE",
 declared_origin:"SYNTHETIC",holdout_commitment_sha256:holdout.commitment_sha256
})+"\n");
const submission=sealSubmission(src,metadata,holdout,frozen,"ab".repeat(32)).publicCommitment;
const bytes=x=>Buffer.from(JSON.stringify(x,null,2)+"\n");
const hb=bytes(holdout),sb=bytes(submission);
const hash=b=>createHash("sha256").update(b).digest("hex");
const anchor=(digit)=>{const sha=digit.repeat(40);return {kind:"GITHUB_COMMIT",url:"https://github.com/synthetic/example/commit/"+sha,sha};};
function makeRecord(){
 return {
  schema:"CJ-HAI001-CUSTODY-SEQUENCE-v1",protocol:"HAI-001",
  task_pack_sha256:frozen.pack_sha256,record_kind:"SYNTHETIC",
  task_id:holdout.task_id,trial_id:submission.trial_id,
  custodian_id:"CUSTODIAN_FAKE_001",
  notes:"Purely synthetic fabricated chronological events and fake URLs. No actual attestations.",
  events:[
   {stage:"HOLDOUT_COMMITMENT_PUBLISHED",timestamp_utc:"2026-10-11T12:00:00Z",witness_id:"WITNESS_FAKE_001",anchor:anchor("a"),commitment_file_sha256:hash(hb)},
   {stage:"SUBMISSION_COMMITMENT_PUBLISHED",timestamp_utc:"2026-10-11T13:00:00Z",witness_id:"WITNESS_FAKE_002",anchor:anchor("b"),commitment_file_sha256:hash(sb)},
   {stage:"SUBMISSION_WINDOW_CLOSED",timestamp_utc:"2026-10-11T14:00:00Z",witness_id:"WITNESS_FAKE_003",anchor:anchor("c"),commitment_file_sha256:null}
  ]
 };
}
const evaluate=(timeline=makeRecord(),h=hb,s=sb,lock=frozen)=>inspectSequence(timeline,h,s,lock);
test("correctly ordered synthetic ledger never authorizes reveal or execution",()=>{
 const report=evaluate();
 assert.equal(report.screening_status,"SYNTHETIC_TEST_ONLY");
 assert.equal(report.stage_order_claimed,true);
 assert.equal(report.commitment_file_hashes_match,true);
 for(const key of ["external_publication_verified","independent_witness_verified","consent_verified","source_verified","holdout_verified","authorized_to_reveal","authorized_to_execute","scientific_result"])
  assert.equal(report[key],false,key+" must remain false");
});
test("even self-attested observed chronology NEVER gets automatic authorization",()=>{
 const holdObs={...holdout};
 const metadataObs=JSON.parse(metadata.toString());metadataObs.declared_origin="SELF_REPORTED";
 const srcObs=sealSubmission(src,bytes(metadataObs),holdObs,frozen,"bc".repeat(32)).publicCommitment;
 const record=makeRecord();record.record_kind="ATTESTED_OBSERVATION";
 record.events[1].commitment_file_sha256=hash(bytes(srcObs));
 const report=evaluate(record,hb,bytes(srcObs));
 assert.equal(report.screening_status,"STRUCTURAL_SEQUENCE_RECORDED");
 assert.equal(report.independent_witness_verified,false);
 assert.equal(report.authorized_to_execute,false);
 assert.equal(report.authorized_to_reveal,false);
});
test("event order, claimed chronological time and URL anchor must all be valid",()=>{
 const reversed=makeRecord();
 [reversed.events[0],reversed.events[1]]=[reversed.events[1],reversed.events[0]];
 assert.throws(()=>evaluate(reversed));
 const sameTime=makeRecord();sameTime.events[1].timestamp_utc=sameTime.events[0].timestamp_utc;
 assert.throws(()=>evaluate(sameTime));
 const badTime=makeRecord();badTime.events[2].timestamp_utc="2026-99-99T14:00:00Z";
 assert.throws(()=>evaluate(badTime));
 const duplicate=makeRecord();duplicate.events[1].anchor=duplicate.events[0].anchor;
 assert.throws(()=>evaluate(duplicate));
 const mismatch=makeRecord();mismatch.events[1].anchor.url="https://github.com/synthetic/example/commit/"+"f".repeat(40);
 assert.throws(()=>evaluate(mismatch));
 const site=makeRecord();site.events[0].anchor.url="http://example.com/commit/"+"a".repeat(40);
 assert.throws(()=>evaluate(site));
});
test("commitment file bytes are cryptographically bound and protocol/task bound",()=>{
 assert.throws(()=>evaluate(makeRecord(),Buffer.concat([hb,Buffer.from(" ")])));
 const altered=makeRecord();altered.events[0].commitment_file_sha256="0".repeat(64);
 assert.throws(()=>evaluate(altered));
 const task=makeRecord();task.task_id="HAI-001-T12";
 assert.throws(()=>evaluate(task));
 const pack=makeRecord();pack.task_pack_sha256="0".repeat(64);
 assert.throws(()=>evaluate(pack));
 const witness=makeRecord();witness.events[0].witness_id=witness.custodian_id;
 assert.throws(()=>evaluate(witness));
 const event=makeRecord();event.events[2].commitment_file_sha256=hash(hb);
 assert.throws(()=>evaluate(event));
});
test("synthetic vs observed relabeling and extra metadata fail closed",()=>{
 const obs=makeRecord();obs.record_kind="ATTESTED_OBSERVATION";
 assert.throws(()=>evaluate(obs));
 const extra=makeRecord();extra.participant_email="private@example.com";
 assert.throws(()=>evaluate(extra));
 const short=makeRecord();short.events.pop();
 assert.throws(()=>evaluate(short));
 const alteredCommitment={...submission,holdout_commitment_sha256:"f".repeat(64)};
 assert.throws(()=>evaluate(makeRecord(),hb,bytes(alteredCommitment)));
});
test("offline CLI reads public files and never executes candidate source",()=>{
 const dir=mkdtempSync(join(tmpdir(),"hai-sequence-"));
 try{
  const timeline=join(dir,"timeline.json"),h=join(dir,"holdout.json"),s=join(dir,"submission.json");
  writeFileSync(timeline,bytes(makeRecord()));writeFileSync(h,hb);writeFileSync(s,sb);
  const result=inspectFiles(timeline,h,s);
  assert.equal(result.screening_status,"SYNTHETIC_TEST_ONLY");
  assert.equal(result.authorized_to_execute,false);
  writeFileSync(h,Buffer.concat([hb,Buffer.from(" ")]));
  assert.throws(()=>inspectFiles(timeline,h,s));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
