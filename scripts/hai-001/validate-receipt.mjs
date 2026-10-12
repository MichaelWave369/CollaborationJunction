import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PACK_DIR, verifyLock } from "./verify-lock.mjs";
import { join } from "node:path";

export function validateReceipt(receipt) {
  const lock=verifyLock();
  const tasks=JSON.parse(readFileSync(join(PACK_DIR,"tasks.json"),"utf8"));
  const fixtures=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
  assert.equal(receipt.protocol,"HAI-001");
  assert.equal(receipt.task_pack_sha256,lock.pack_sha256);
  assert.ok(["A","B","C","D"].includes(receipt.condition),"Unregistered experimental arm");
  assert.ok(tasks.tasks.some(t=>t.id===receipt.task_id),"Unknown task");
  const group=fixtures.groups.find(g=>g.task_id===receipt.task_id);
  assert.ok(group,"Missing frozen acceptance group");
  assert.ok(["SYNTHETIC","RECORDED_UNVERIFIED"].includes(receipt.record_kind),"Invalid receipt kind");
  assert.ok(["NOT_RUN","COMPLETED","FAILED","INTERRUPTED"].includes(receipt.status),"Invalid trial state");
  if(receipt.record_kind==="SYNTHETIC") assert.equal(receipt.status,"NOT_RUN","Synthetic receipts never represent observed runs");
  if(receipt.record_kind==="RECORDED_UNVERIFIED") assert.notEqual(receipt.status,"NOT_RUN","Real receipts must have a measured status");
  assert.equal(typeof receipt.trial_id,"string");
  assert.match(receipt.trial_id,/^[A-Z0-9_-]{3,80}$/,"Trial id must be opaque/non-identifying");
  assert.equal(typeof receipt.environment,"string");
  assert.equal(typeof receipt.notes,"string");
  assert.ok(Array.isArray(receipt.test_results));
  const expected=new Set(group.cases.map(c=>c.case_id));
  const observed=new Set();
  for(const result of receipt.test_results) {
    assert.ok(expected.has(result.case_id),"Unexpected case id");
    assert.ok(!observed.has(result.case_id),"Duplicate case id");
    assert.equal(typeof result.passed,"boolean");
    observed.add(result.case_id);
  }
  assert.equal(observed.size,expected.size,"Every predeclared case needs a pass/fail entry; missing counts as fail only after recorded adjudication");
  assert.ok(Array.isArray(receipt.human_decisions));
  assert.ok(Array.isArray(receipt.exclusions));
  assert.equal(typeof receipt.model_id,"string");
  if(receipt.condition==="A") assert.equal(receipt.model_id,"none","Human-only arm cannot declare a model");
  const passed=receipt.test_results.filter(c=>c.passed).length;
  return {protocol:receipt.protocol,task_id:receipt.task_id,record_kind:receipt.record_kind,passed,total:expected.size,proportion:passed/expected.size,warning:"This validates receipt structure, not the truth of reported case outcomes."};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]))) {
  try{
    if(!process.argv[2]) throw new Error("Usage: node scripts/hai-001/validate-receipt.mjs PATH_TO_RECEIPT.json");
    const receipt=JSON.parse(readFileSync(process.argv[2],"utf8"));
    const result=validateReceipt(receipt);
    console.log(JSON.stringify(result,null,2));
    if(result.record_kind==="SYNTHETIC") console.log("SYNTHETIC DRY RUN ONLY - NOT EXPERIMENTAL DATA");
  }catch(err){console.error(err.message);process.exitCode=1;}
}
