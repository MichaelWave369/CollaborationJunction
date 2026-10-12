import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateCalibration } from "../scripts/hai-001/calibration-check.mjs";
import { verifyLock, PACK_DIR } from "../scripts/hai-001/verify-lock.mjs";
const lock=verifyLock();
const template=JSON.parse(readFileSync(new URL("../calibration/HAI-001/observations.template.json",import.meta.url),"utf8"));
const tasks=JSON.parse(readFileSync(new URL("../protocols/HAI-001/v0.1.0/tasks.json",import.meta.url),"utf8")).tasks;
const copy=x=>structuredClone(x);
function syntheticFull(){
 const record=copy(template);
 record.origin="SYNTHETIC";
 record.notes="Artificial fixtures generated solely for validator tests; not empirical observations.";
 record.reviews=[];
 record.pilots=[];
 for(const task of tasks)for(let i=1;i<=2;i++){
  const key=String(i).padStart(3,"0");
  record.reviews.push({task_id:task.id,reviewer_id:"FAKE_RATER_"+key,spec_clarity:5,estimated_effort:2,ambiguity:1});
  record.pilots.push({task_id:task.id,pilot_id:"FAKE_PILOT_"+key,condition:"A",wall_seconds:300,passed_cases:5,cases_crosschecked:false});
 }
 return record;
}
test("empty template clearly indicates no calibration and no original research",()=>{
 const report=evaluateCalibration(template);
 assert.equal(report.state,"NOT_STARTED");
 assert.equal(report.independently_calibrated,false);
 assert.equal(report.data_counts.pilots,0);
 assert.equal(report.coverage.reviewed_tasks,0);
 assert.equal(report.coverage.piloted_tasks,0);
});
test("synthetic full coverage NEVER yields empirical readiness",()=>{
 const sample=syntheticFull();
 sample.pilots.forEach(p=>p.cases_crosschecked=true);
 const report=evaluateCalibration(sample);
 assert.equal(report.coverage.reviewed_tasks,12);
 assert.equal(report.coverage.piloted_tasks,12);
 assert.equal(report.state,"SYNTHETIC_NOT_EVIDENCE");
 assert.equal(report.independently_calibrated,false);
});
test("even purported observed full coverage only leads to human methods review",()=>{
 const sample=syntheticFull();
 sample.origin="OBSERVED";sample.consent_attested=true;
 sample.pilots.forEach(p=>p.cases_crosschecked=true);
 const report=evaluateCalibration(sample);
 assert.equal(report.state,"MANUAL_REVIEW_REQUIRED");
 assert.equal(report.independently_calibrated,false);
});
test("insufficient coverage is held back",()=>{
 const sample=syntheticFull();
 sample.origin="OBSERVED";sample.consent_attested=true;
 sample.reviews=sample.reviews.slice(0,2);sample.pilots=sample.pilots.slice(0,2);
 sample.pilots.forEach(p=>p.cases_crosschecked=true);
 const report=evaluateCalibration(sample);
 assert.equal(report.state,"INCOMPLETE");
 assert.ok(report.screening_flags.length>0);
});
test("rejects dishonest template and malformed, duplicated or non-baseline rows",()=>{
 const sample=syntheticFull();
 assert.throws(()=>evaluateCalibration({...sample,origin:"TEMPLATE"}));
 assert.throws(()=>evaluateCalibration({...sample,origin:"OBSERVED"}));
 assert.throws(()=>evaluateCalibration({...sample,task_pack_sha256:"0000"}));
 assert.throws(()=>evaluateCalibration({...sample,reviews:[...sample.reviews,sample.reviews[0]]}));
 assert.throws(()=>evaluateCalibration({...sample,pilots:[...sample.pilots,{...sample.pilots[0],condition:"C"}]}));
 const bad=copy(sample);bad.pilots[0].wall_seconds=-100;assert.throws(()=>evaluateCalibration(bad));
 const bad2=copy(sample);bad2.pilots[0].condition="B";assert.throws(()=>evaluateCalibration(bad2));
 const bad3=copy(sample);bad3.reviews[0].ambiguity=8;assert.throws(()=>evaluateCalibration(bad3));
});
test("flags difficulty spread and low clarity without silently matching tasks",()=>{
 const sample=syntheticFull();
 for(const row of sample.reviews.filter(x=>x.task_id===tasks[0].id)){row.spec_clarity=2;row.ambiguity=4;}
 for(const row of sample.pilots.filter(x=>x.task_id===tasks[0].id)){row.wall_seconds=1200;row.passed_cases=1;row.cases_crosschecked=true;}
 for(const row of sample.pilots)row.cases_crosschecked=true;
 const report=evaluateCalibration(sample);
 assert.ok(report.screening_flags.some(x=>x.includes("2x")));
 assert.ok(report.screening_flags.some(x=>x.includes("clarity")));
 assert.ok(report.screening_flags.some(x=>x.includes("pass rate")));
 assert.equal(report.independently_calibrated,false);
});
