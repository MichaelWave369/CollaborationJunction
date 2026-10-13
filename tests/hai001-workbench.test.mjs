import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeEmptyRecord,validateRecord,appendEntry,counts } from "../site/calibration/core.mjs";
import { verifyLock,PACK_DIR } from "../scripts/hai-001/verify-lock.mjs";
import { join } from "node:path";

const lock=verifyLock();
const pack=JSON.parse(readFileSync(join(PACK_DIR,"tasks.json"),"utf8"));
const taskIds=pack.tasks.map(t=>t.id);
const initial=()=>makeEmptyRecord(lock.pack_sha256);
const review={task_id:taskIds[0],reviewer_id:"RATER_001",spec_clarity:4,estimated_effort:3,ambiguity:1};
const pilot={task_id:taskIds[1],pilot_id:"PILOT_001",condition:"A",wall_seconds:350,passed_cases:4,cases_crosschecked:false};
const parse=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("published calibration task pack, cases and lock are byte-for-byte copies",()=>{
 for(const name of ["tasks.json","fixtures.json","LOCK.json"]){
  const original=readFileSync(join(PACK_DIR,name));
  const published=readFileSync(new URL("../site/calibration/"+name,import.meta.url));
  assert.ok(original.equals(published),name+" is not an exact frozen source copy");
 }
});

test("source HTML contains first-party script, frozen kit and accessibility labels",()=>{
 const html=parse("../site/calibration/index.html");
 const js=parse("../site/calibration/workbench.mjs");
 const homepage=parse("../site/index.html");
 assert.ok(html.includes('type="module" src="./workbench.mjs"'));
 assert.ok(html.includes('id="origin"'));
 assert.ok(html.includes('id="task"'));
 assert.ok(html.includes('id="crosschecked"'));
 assert.ok(homepage.includes('href="./calibration/"'));
 assert.ok(js.includes('crypto.subtle.digest("SHA-256"'));
 assert.ok(js.includes('"./fixtures.json"'));
 assert.ok(js.includes("createObjectURL"));
 assert.ok(!js.includes("localStorage"));
 assert.ok(!js.includes("sendBeacon"));
 assert.ok(!js.includes("navigator.sendBeacon"));
});

test("new session defaults to synthetic without fabricated observations",()=>{
 const record=initial();
 assert.equal(record.origin,"SYNTHETIC");
 assert.equal(record.consent_attested,false);
 assert.deepEqual(counts(record),{reviews:0,pilots:0,uniqueTasks:0});
 assert.deepEqual(validateRecord(record,lock.pack_sha256,taskIds),record);
});
test("observed records require an explicit consent attestation",()=>{
 assert.throws(()=>makeEmptyRecord(lock.pack_sha256,"OBSERVED",false));
 const obs=makeEmptyRecord(lock.pack_sha256,"OBSERVED",true);
 assert.equal(obs.consent_attested,true);
 assert.deepEqual(validateRecord(obs,lock.pack_sha256,taskIds),obs);
 assert.throws(()=>validateRecord({...obs,consent_attested:false},lock.pack_sha256,taskIds));
});
test("review and unaided condition-A pilot append without inventing scores",()=>{
 const one=appendEntry(initial(),review,"review",lock.pack_sha256,taskIds);
 const two=appendEntry(one,pilot,"pilot",lock.pack_sha256,taskIds);
 assert.deepEqual(counts(two),{reviews:1,pilots:1,uniqueTasks:2});
 assert.equal(two.pilots[0].passed_cases,4);
 assert.equal(two.pilots[0].cases_crosschecked,false);
 assert.equal(two.origin,"SYNTHETIC");
 assert.equal(one.pilots.length,0,"Append must not mutate previous session");
});
test("duplicate IDs, AI conditions, invalid score and time are rejected",()=>{
 const one=appendEntry(initial(),review,"review",lock.pack_sha256,taskIds);
 assert.throws(()=>appendEntry(one,review,"review",lock.pack_sha256,taskIds));
 assert.throws(()=>appendEntry(initial(),{...pilot,condition:"C"},"pilot",lock.pack_sha256,taskIds));
 assert.throws(()=>appendEntry(initial(),{...pilot,wall_seconds:1501},"pilot",lock.pack_sha256,taskIds));
 assert.throws(()=>appendEntry(initial(),{...pilot,passed_cases:-1},"pilot",lock.pack_sha256,taskIds));
 assert.throws(()=>appendEntry(initial(),{...review,spec_clarity:6},"review",lock.pack_sha256,taskIds));
 assert.throws(()=>appendEntry(initial(),{...review,reviewer_id:"name@example.com"},"review",lock.pack_sha256,taskIds));
});
test("reject cross-version records, unknown tasks, invalid and duplicate imports",()=>{
 const valid=appendEntry(initial(),review,"review",lock.pack_sha256,taskIds);
 assert.throws(()=>validateRecord({...valid,task_pack_sha256:"0".repeat(64)},lock.pack_sha256,taskIds));
 assert.throws(()=>validateRecord({...valid,reviews:[{...review,task_id:"OTHER"}]},lock.pack_sha256,taskIds));
 assert.throws(()=>validateRecord({...valid,reviews:[review,review]},lock.pack_sha256,taskIds));
 assert.throws(()=>validateRecord({...valid,origin:"TEMPLATE"},lock.pack_sha256,taskIds));
 assert.throws(()=>validateRecord({...valid,pilots:[{...pilot,cases_crosschecked:"true"}]},lock.pack_sha256,taskIds));
});
test("sanitized imports drop unrecognized surplus fields",()=>{
 const raw={...initial(),person_name:"Do not copy",reviews:[{...review,email:"private"}]};
 const clean=validateRecord(raw,lock.pack_sha256,taskIds);
 assert.equal(Object.hasOwn(clean,"person_name"),false);
 assert.equal(Object.hasOwn(clean.reviews[0],"email"),false);
});
