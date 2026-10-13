/**
 * HAI-001 read-only, no-execution custody sequencing screen.
 *
 * Verifies formats and self-reported event ordering against public commitment
 * files. It DOES NOT query GitHub, authenticate witnesses, establish chronology,
 * authorize reveal, execute code, or verify provenance.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {TextDecoder} from "node:util";

export const SEQUENCE_SCHEMA="CJ-HAI001-CUSTODY-SEQUENCE-v1";
const PACK=/^[a-f0-9]{64}$/;
const OPAQUE=/^[A-Z0-9_-]{3,64}$/;
const TRIAL=/^TRIAL_[A-Z0-9_-]{4,64}$/;
const WITNESS=/^WITNESS_[A-Z0-9_-]{3,48}$/;
const CUSTODIAN=/^CUSTODIAN_[A-Z0-9_-]{3,48}$/;
const TASK=/^HAI-001-T(0[1-9]|1[0-2])$/;
const STAGES=["HOLDOUT_COMMITMENT_PUBLISHED","SUBMISSION_COMMITMENT_PUBLISHED","SUBMISSION_WINDOW_CLOSED"];
const MAX_BYTES=1024*1024;
const exact=(value,keys,label)=>{
 assert.ok(value&&typeof value==="object"&&!Array.isArray(value),label+" must be a JSON object");
 assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),label+" has unsupported or missing fields");
};
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
function parseBytes(bytes,who) {
 assert.ok(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=MAX_BYTES,who+" must be 1 byte to 1 MiB");
 const raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 return JSON.parse(raw);
}
function isoSecondTime(value) {
 assert.ok(typeof value==="string"&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value),"Use exact UTC seconds, YYYY-MM-DDTHH:MM:SSZ");
 const ms=Date.parse(value);
 assert.ok(Number.isFinite(ms)&&new Date(ms).toISOString()===value.replace("Z",".000Z"),"Invalid date/time");
 return ms;
}
function anchor(entry) {
 exact(entry,["kind","url","sha"],"Anchor");
 assert.equal(entry.kind,"GITHUB_COMMIT");
 assert.ok(typeof entry.sha==="string"&&/^[a-f0-9]{40}$/.test(entry.sha),"Expected 40-character git commit SHA");
 assert.ok(typeof entry.url==="string","Missing GitHub commit URL");
 const u=new URL(entry.url);
 assert.equal(u.protocol,"https:","Timestamp witness must be an HTTPS URL");
 assert.equal(u.hostname,"github.com","Only publicly addressable GitHub commit anchor format currently supported");
 assert.equal(u.username,"");
 assert.equal(u.password,"");
 assert.equal(u.search,"");
 assert.equal(u.hash,"");
 const parts=u.pathname.split("/").filter(Boolean);
 assert.ok(parts.length===4&&parts[2]==="commit"&&parts[3]===entry.sha&&parts[0]&&parts[1],"GitHub commit URL must include exactly the claimed SHA");
 // A plausible URL is only a claim: this module never opens the URL.
}
function checkCommitments(holdout,submission,lock) {
 const holdKeys=["schema","protocol","task_pack_sha256","task_id","case_set_id","case_count","algorithm","commitment_sha256","status","note"];
 const sourceKeys=["schema","protocol","task_pack_sha256","task_id","trial_id","condition","tool_class","declared_origin","holdout_commitment_sha256","algorithm","commitment_sha256","status","note"];
 exact(holdout,holdKeys,"Holdout");
 exact(submission,sourceKeys,"Submission");
 assert.ok(lock&&PACK.test(lock.pack_sha256),"Locked protocol hash unavailable");
 assert.equal(holdout.schema,"CJ-HAI001-HOLDOUT-COMMIT-v1");
 assert.equal(submission.schema,"CJ-HAI001-SUBMISSION-COMMIT-v1");
 assert.equal(holdout.protocol,"HAI-001");
 assert.equal(submission.protocol,"HAI-001");
 assert.equal(holdout.task_pack_sha256,lock.pack_sha256);
 assert.equal(submission.task_pack_sha256,lock.pack_sha256);
 assert.match(holdout.task_id,TASK);
 assert.equal(submission.task_id,holdout.task_id,"Source task must match hidden challenge");
 assert.match(submission.trial_id,TRIAL);
 assert.ok(typeof holdout.case_set_id==="string"&&/^HOLDOUT_[A-Z0-9_-]{3,40}$/.test(holdout.case_set_id));
 assert.ok(Number.isInteger(holdout.case_count)&&holdout.case_count>=3&&holdout.case_count<=50);
 assert.equal(holdout.algorithm,"SHA-256");
 assert.equal(submission.algorithm,"SHA-256");
 assert.equal(holdout.status,"SEALED_NOT_EVALUATED");
 assert.equal(submission.status,"SUBMISSION_BYTES_COMMITTED_UNVERIFIED");
 assert.ok(PACK.test(holdout.commitment_sha256)&&PACK.test(submission.commitment_sha256));
 assert.equal(submission.holdout_commitment_sha256,holdout.commitment_sha256,"Submission must bind exactly to earlier challenge commitment");
 const tools={A:"NONE",B:"LOCAL_MODEL",C:"CLOUD_MODEL",D:"MODEL_FIRST"};
 assert.equal(submission.tool_class,tools[submission.condition],"Inconsistent tool class");
 assert.ok(["SYNTHETIC","SELF_REPORTED"].includes(submission.declared_origin),"Unrecognized submission origin");
}
export function inspectSequence(record,holdoutBytes,submissionBytes,lock) {
 const holdout=parseBytes(holdoutBytes,"Holdout commitment");
 const submission=parseBytes(submissionBytes,"Submission commitment");
 checkCommitments(holdout,submission,lock);
 exact(record,["schema","protocol","task_pack_sha256","record_kind","task_id","trial_id","custodian_id","events","notes"],"Sequence");
 assert.equal(record.schema,SEQUENCE_SCHEMA);
 assert.equal(record.protocol,"HAI-001");
 assert.equal(record.task_pack_sha256,lock.pack_sha256);
 assert.ok(["SYNTHETIC","ATTESTED_OBSERVATION"].includes(record.record_kind),"Missing provenance class");
 assert.equal(record.task_id,holdout.task_id);
 assert.equal(record.trial_id,submission.trial_id);
 assert.match(record.custodian_id,CUSTODIAN);
 assert.ok(typeof record.notes==="string"&&record.notes.length<=1000);
 assert.ok(Array.isArray(record.events)&&record.events.length===3,"Exactly three pre-reveal stages required");
 const expectedFileHashes=[digest(holdoutBytes),digest(submissionBytes),null];
 const stageTimes=[];
 const anchors=[];
 for(let i=0;i<STAGES.length;i++){
  const e=record.events[i];
  exact(e,["stage","timestamp_utc","witness_id","anchor","commitment_file_sha256"],"Sequence event");
  assert.equal(e.stage,STAGES[i],"Stage order violation");
  assert.match(e.witness_id,WITNESS);
  assert.notEqual(e.witness_id,record.custodian_id,"Custodian must not also be independent witness");
  assert.equal(e.commitment_file_sha256,expectedFileHashes[i],"Event must match the exact public file bytes; closure has no commitment-file digest");
  anchor(e.anchor);
  assert.ok(!anchors.includes(e.anchor.sha),"Separate stages require distinct purported public commit anchors");
  anchors.push(e.anchor.sha);
  const when=isoSecondTime(e.timestamp_utc);
  if(i)assert.ok(when>stageTimes[i-1],"Reported event timestamps must be strictly increasing");
  stageTimes.push(when);
 }
 const observations=(record.record_kind==="ATTESTED_OBSERVATION"&&submission.declared_origin==="SELF_REPORTED");
 const consistency=record.record_kind==="SYNTHETIC"&&submission.declared_origin==="SYNTHETIC";
 assert.ok(observations||consistency,"Synthetic and claimed observed provenance must not be relabeled");
 return {
  schema:"CJ-HAI001-CUSTODY-PREFLIGHT-REPORT-v1",
  task_id:holdout.task_id,trial_id:submission.trial_id,
  pack_sha256:lock.pack_sha256,record_kind:record.record_kind,
  stage_order_claimed:true,commitment_file_hashes_match:true,
  reported_start_utc:record.events[0].timestamp_utc,
  reported_cutoff_utc:record.events[2].timestamp_utc,
  screening_status:record.record_kind==="SYNTHETIC"?"SYNTHETIC_TEST_ONLY":"STRUCTURAL_SEQUENCE_RECORDED",
  external_publication_verified:false,independent_witness_verified:false,
  consent_verified:false,source_verified:false,holdout_verified:false,
  authorized_to_reveal:false,authorized_to_execute:false,scientific_result:false,
  required_next_step:"Independent reviewers must inspect the real external commit URLs, authors and timestamps, source/holdout reveal checks, signed witness custody records, consent and evaluator security before any authorization.",
  warning:"Stage order and GitHub URLs are self-reported; this program performs no network checks and cannot prove when, where or by whom a commitment was published."
 };
}
