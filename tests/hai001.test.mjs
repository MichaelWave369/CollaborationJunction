import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyLock, PACK_DIR } from "../scripts/hai-001/verify-lock.mjs";
import { validateReceipt } from "../scripts/hai-001/validate-receipt.mjs";

const parse=file=>JSON.parse(readFileSync(join(PACK_DIR,file),"utf8"));
const tasks=parse("tasks.json"),fixtures=parse("fixtures.json"),conditions=parse("conditions.json");
const synthetic=JSON.parse(readFileSync(new URL("../examples/hai-001-synthetic-receipt.json",import.meta.url),"utf8"));

test("frozen protocol passes full SHA-256 byte verification",()=>{
 const lock=verifyLock();
 assert.match(lock.pack_sha256,/^[a-f0-9]{64}$/);
 assert.equal(Object.keys(lock.files).length,4);
});
test("tampering even one source byte fails verification",()=>{
 const temporary=mkdtempSync(join(tmpdir(),"cj-hai001-"));
 try{
  for(const name of ["tasks.json","fixtures.json","rubric.json","conditions.json","LOCK.json"])cpSync(join(PACK_DIR,name),join(temporary,name));
  const source=readFileSync(join(temporary,"tasks.json"),"utf8");
  writeFileSync(join(temporary,"tasks.json"),source+"\n");
  assert.throws(()=>verifyLock(temporary));
 }finally{rmSync(temporary,{recursive:true,force:true});}
});
test("12 distinct tasks in four balanced families; each has five frozen cases",()=>{
 assert.equal(tasks.tasks.length,12);
 assert.equal(new Set(tasks.tasks.map(t=>t.id)).size,12);
 const familyCounts=tasks.tasks.reduce((memo,t)=>(memo[t.family]=(memo[t.family]||0)+1,memo),{});
 assert.deepEqual(Object.values(familyCounts).sort(),[3,3,3,3]);
 assert.equal(fixtures.groups.length,12);
 const unique=new Set();
 for(const item of tasks.tasks){
  assert.ok(item.spec&&item.interface&&item.runtime);
  const group=fixtures.groups.find(g=>g.task_id===item.id);
  assert.ok(group, "Missing task fixture "+item.id);
  assert.equal(group.cases.length,5);
  for(const c of group.cases){
   assert.ok(c.case_id&&Object.hasOwn(c,"input")&&Object.hasOwn(c,"expected"));
   assert.ok(!unique.has(c.case_id),"Duplicate fixture");
   unique.add(c.case_id);
  }
 }
 assert.equal(unique.size,60);
});
test("conditions constrain execution and explicitly avoid inflated causal claims",()=>{
 assert.equal(conditions.arms.length,4);
 assert.deepEqual(conditions.arms.map(a=>a.id),["A","B","C","D"]);
 assert.equal(conditions.time_limit_minutes,25);
 assert.equal(conditions.expected_cases_per_task,5);
 assert.match(conditions.design.calibration,/calibration/);
});
test("synthetic receipt validates but never becomes measured evidence",()=>{
 const result=validateReceipt(synthetic);
 assert.equal(result.record_kind,"SYNTHETIC");
 assert.equal(result.total,5);
 assert.equal(result.passed,3);
 assert.equal(result.proportion,0.6);
 assert.throws(()=>validateReceipt({...synthetic,status:"COMPLETED"}));
 assert.throws(()=>validateReceipt({...synthetic,task_pack_sha256:"0000"}));
 assert.throws(()=>validateReceipt({...synthetic,test_results:synthetic.test_results.slice(1)}));
 assert.throws(()=>validateReceipt({...synthetic,test_results:[...synthetic.test_results,synthetic.test_results[0]]}));
});
