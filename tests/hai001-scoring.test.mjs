import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreAnswers } from "../site/calibration/score-core.mjs";
import { audit } from "../scripts/hai-001/audit-calibration.mjs";
import { scoreFile } from "../scripts/hai-001/score-answers.mjs";
import { PACK_DIR,verifyLock } from "../scripts/hai-001/verify-lock.mjs";
import { join } from "node:path";

const fixtures=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
const lock=verifyLock();
const sample=JSON.parse(readFileSync(new URL("../examples/hai-001-synthetic-answers.json",import.meta.url),"utf8"));
const copy=obj=>structuredClone(obj);

test("synthetic example is explicitly unobserved and scores exactly 3 of 5",()=>{
 const result=scoreAnswers(sample,fixtures,lock);
 assert.equal(result.source_origin,"SYNTHETIC");
 assert.equal(result.passed_cases,3);
 assert.equal(result.pass_rate,0.6);
 assert.deepEqual(result.results.map(x=>x.passed),[true,true,true,false,false]);
 assert.equal(result.independent_observation_verified,false);
});
test("CLI scorer and pure UI scorer agree and hash the byte input",()=>{
 const r=scoreFile(new URL("../examples/hai-001-synthetic-answers.json",import.meta.url));
 assert.equal(r.passed_cases,3);
 assert.equal(r.submitted_file_sha256.length,64);
});
test("JSON arrays remain ordered; object property order is ignored",()=>{
 const group=fixtures.groups.find(g=>g.task_id===sample.task_id);
 const s=copy(sample);
 s.answers=group.cases.map(c=>({case_id:c.case_id,kind:"VALUE",value:copy(c.expected)}));
 assert.equal(scoreAnswers(s,fixtures,lock).passed_cases,5);
 s.answers[0].value=[...s.answers[0].value].reverse();
 assert.equal(scoreAnswers(s,fixtures,lock).passed_cases,4);
});
test("rejects off-protocol, duplicate, missing, bad-value, and huge-depth answers",()=>{
 const cases=[
  {...sample,task_pack_sha256:"0".repeat(64)},
  {...sample,task_id:"UNKNOWN"},
  {...sample,origin:"TEMPLATE"},
  {...sample,answers:sample.answers.slice(1)},
  {...sample,answers:[...sample.answers.slice(0,4),sample.answers[0]]},
  {...sample,answers:sample.answers.map((a,i)=>i? a : {...a,case_id:"INVALID"}}},
  {...sample,answers:sample.answers.map((a,i)=>i? a : {...a,email:"not permitted"}}},
  {...sample,answers:sample.answers.map((a,i)=>i? a : {...a,kind:"MISSING",value:null}}},
  {...sample,answers:sample.answers.map((a,i)=>i? a : {...a,kind:"VALUE",value:{unsafe:BigInt(2)}})},
  {...sample,pilot_id:"person@example.com"}
 ];
 for(const bad of cases)assert.throws(()=>scoreAnswers(bad,fixtures,lock));
});
test("auditor compares typed totals to original answers and preserves synthetic state",()=>{
 const record={
 schema:"CJ-HAI001-CALIBRATION-v1",protocol:"HAI-001",task_pack_sha256:lock.pack_sha256,
 origin:"SYNTHETIC",consent_attested:false,notes:"Simulated audit test only",
 reviews:[],pilots:[{task_id:sample.task_id,pilot_id:sample.pilot_id,condition:"A",wall_seconds:10,passed_cases:3,cases_crosschecked:true}]
 };
 const score=scoreAnswers(sample,fixtures,lock);
 const report=audit(record,[score]);
 assert.equal(report.matched,1);
 assert.equal(report.pending,0);
 assert.equal(report.status,"SYNTHETIC_NOT_EVIDENCE");
 const mismatch=audit({...record,pilots:[{...record.pilots[0],passed_cases:5}]},[score]);
 assert.equal(mismatch.pending,1);
 assert.equal(mismatch.findings[0].result,"NEEDS_REVIEW");
 assert.throws(()=>audit(record,[score,score]));
});
test("browser only loads verified fixtures and never evaluates submitted code",()=>{
 const js=readFileSync(new URL("../site/calibration/checker.mjs",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../site/calibration/checker.html",import.meta.url),"utf8");
 assert.match(js,/crypto\.subtle\.digest/);
 assert.match(js,/scoreAnswers/);
 assert.match(ui,/never runs JavaScript candidates/i);
 assert.doesNotMatch(js,/\beval\s*\(/);
 assert.doesNotMatch(js,/new Function\s*\(/);
 assert.doesNotMatch(js,/localStorage|sendBeacon|fetch\(file/);
});
