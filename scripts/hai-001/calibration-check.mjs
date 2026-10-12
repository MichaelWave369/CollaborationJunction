/**
 * HAI-001 task calibration ledger inspection.
 * This module NEVER executes candidate code, calls AI, or records experiment results.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PACK_DIR, verifyLock } from "./verify-lock.mjs";

const allowedOrigins = new Set(["TEMPLATE","SYNTHETIC","OBSERVED"]);
const opaque = /^[A-Z0-9_-]{3,48}$/;
const median = numbers => {
  if(!numbers.length) return null;
  const sorted=[...numbers].sort((a,b)=>a-b);
  const i=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[i] : (sorted[i-1]+sorted[i])/2;
};
const mean = numbers => numbers.length ? numbers.reduce((a,b)=>a+b,0)/numbers.length : null;
const round = number => number==null ? null : Math.round(number*1000)/1000;
function rowId(key,value) {
  assert.equal(typeof value,"string",key+" must be an opaque code, not a name");
  assert.ok(opaque.test(value),key+" must match "+opaque);
}
function rating(name,value){assert.ok(Number.isInteger(value)&&value>=1&&value<=5,name+" outside 1..5");}
function pairUnique(records, kind) {
  const seen=new Set();
  for(const row of records) {
    const id=row.task_id+"|"+(kind==="review"?row.reviewer_id:row.pilot_id);
    assert.ok(!seen.has(id),"Repeated "+kind+" record for task and evaluator: "+id);
    seen.add(id);
  }
}
export function evaluateCalibration(record) {
  const lock=verifyLock();
  const taskPack=JSON.parse(readFileSync(join(PACK_DIR,"tasks.json"),"utf8"));
  const taskIds=taskPack.tasks.map(t=>t.id);
  const allowed=new Set(taskIds);
  assert.equal(record.schema,"CJ-HAI001-CALIBRATION-v1","Unknown calibration schema");
  assert.equal(record.protocol,"HAI-001");
  assert.equal(record.task_pack_sha256,lock.pack_sha256,"Calibration tied to wrong frozen task pack");
  assert.ok(allowedOrigins.has(record.origin),"Origin must be TEMPLATE, SYNTHETIC or OBSERVED");
  assert.ok(Array.isArray(record.reviews),"reviews missing");
  assert.ok(Array.isArray(record.pilots),"pilots missing");
  assert.equal(typeof record.consent_attested,"boolean","Consent attestation field required");
  if(record.origin==="OBSERVED")assert.equal(record.consent_attested,true,"Real participant records require attested informed consent");
  assert.equal(typeof record.notes,"string","String notes field required");
  if(record.origin==="TEMPLATE")assert.ok(!record.reviews.length&&!record.pilots.length,"Template cannot carry measurements");
  for(const item of record.reviews){
    assert.ok(allowed.has(item.task_id),"Unknown review task "+item.task_id);
    rowId("reviewer_id",item.reviewer_id);
    rating("spec_clarity",item.spec_clarity);
    rating("estimated_effort",item.estimated_effort);
    rating("ambiguity",item.ambiguity);
  }
  for(const item of record.pilots){
    assert.ok(allowed.has(item.task_id),"Unknown pilot task "+item.task_id);
    rowId("pilot_id",item.pilot_id);
    assert.equal(item.condition,"A","Only human-only baseline calibration permitted");
    assert.ok(Number.isInteger(item.wall_seconds)&&item.wall_seconds>0&&item.wall_seconds<=1500,"Pilot wall_seconds must be in (0,1500]");
    assert.ok(Number.isInteger(item.passed_cases)&&item.passed_cases>=0&&item.passed_cases<=5,"Pilot passed_cases must be integer 0..5");
    assert.equal(typeof item.cases_crosschecked,"boolean","Explicit score receipt cross-check field required");
  }
  pairUnique(record.reviews,"review");
  pairUnique(record.pilots,"pilot");
  const per_task=taskIds.map(id=>{
    const reviews=record.reviews.filter(x=>x.task_id===id);
    const pilots=record.pilots.filter(x=>x.task_id===id);
    return {
      task_id:id,
      reviewers:reviews.length,pilots:pilots.length,
      mean_clarity:round(mean(reviews.map(x=>x.spec_clarity))),
      mean_ambiguity:round(mean(reviews.map(x=>x.ambiguity))),
      median_predicted_effort:round(median(reviews.map(x=>x.estimated_effort))),
      median_wall_seconds:round(median(pilots.map(x=>x.wall_seconds))),
      mean_case_pass_rate:round(mean(pilots.map(x=>x.passed_cases/5))),
      all_case_scores_crosschecked:pilots.length>0&&pilots.every(x=>x.cases_crosschecked)
    };
  });
  const missing_reviews=per_task.filter(x=>x.reviewers<2).map(x=>x.task_id);
  const missing_pilots=per_task.filter(x=>x.pilots<2).map(x=>x.task_id);
  const flags=[];
  if(missing_reviews.length)flags.push("Insufficient independent specification reviews for "+missing_reviews.length+" of 12 tasks (minimum two per task).");
  if(missing_pilots.length)flags.push("Insufficient human-only pilot samples for "+missing_pilots.length+" of 12 tasks (minimum two per task).");
  if(record.pilots.some(x=>!x.cases_crosschecked))flags.push("One or more self-reported pass totals lack independent receipt cross-check.");
  for(const task of per_task){
    if(task.mean_clarity!==null&&task.mean_clarity<4)flags.push(task.task_id+": clarity under screening threshold 4/5");
    if(task.mean_ambiguity!==null&&task.mean_ambiguity>2)flags.push(task.task_id+": ambiguity above screening threshold 2/5");
    if(task.mean_case_pass_rate!==null&&task.mean_case_pass_rate<0.6)flags.push(task.task_id+": pilot pass rate below 60%; inspect specification/test validity");
  }
  if(!missing_pilots.length) {
    const times=per_task.map(x=>x.median_wall_seconds);
    const ratio=Math.max(...times)/Math.min(...times);
    if(ratio>2) flags.push("Median human-only time spread exceeds 2x across tasks (screening signal, not automatic invalidation).");
  }
  let state="INCOMPLETE";
  if(record.origin==="TEMPLATE")state="NOT_STARTED";
  else if(record.origin==="SYNTHETIC")state="SYNTHETIC_NOT_EVIDENCE";
  else if(!missing_reviews.length&&!missing_pilots.length&&!record.pilots.some(x=>!x.cases_crosschecked))state="MANUAL_REVIEW_REQUIRED";
  return {
    protocol:"HAI-001",
    pack_sha256:lock.pack_sha256,
    state,
    research_status:"NO CONFIRMATORY TRIALS CLAIMED",
    independently_calibrated:false,
    origin:record.origin,
    data_counts:{reviews:record.reviews.length,pilots:record.pilots.length,tasks:taskIds.length},
    coverage:{reviewed_tasks:per_task.filter(x=>x.reviewers>=2).length,piloted_tasks:per_task.filter(x=>x.pilots>=2).length},
    screening_flags:flags,
    per_task,
    required_next_step:state==="MANUAL_REVIEW_REQUIRED"
      ? "Human methods review, suitability decision, external validation and signed calibration signoff; this CLI never marks tasks statistically matched."
      : "Collect appropriately consented, independently documented calibration only. Do not publish synthetic input as observations."
  };
}
const isMain = process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(isMain){
  try {
    if(process.argv.length>3)throw Error("Usage: node scripts/hai-001/calibration-check.mjs [CALIBRATION_JSON]");
    const source=process.argv[2]||fileURLToPath(new URL("../../calibration/HAI-001/observations.template.json",import.meta.url));
    const result=evaluateCalibration(JSON.parse(readFileSync(source,"utf8")));
    console.log(JSON.stringify(result,null,2));
  }catch(err){console.error("CALIBRATION VALIDATION ERROR: "+err.message);process.exitCode=1;}
}
