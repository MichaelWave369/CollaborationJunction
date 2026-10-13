/**
 * HAI-001 JSON-only case comparison engine.
 * Pure functions only. NEVER execute, import, evaluate or sandbox submitted code.
 * This compares a finite public fixture set and does not certify authorship,
 * human-only compliance, consent, correctness beyond fixtures, or provenance.
 */
export const ANSWER_SCHEMA="CJ-HAI001-ANSWERS-v1";
export const SCORE_SCHEMA="CJ-HAI001-CASE-SCORE-v1";
const opaque=/^[A-Z0-9_-]{3,48}$/;
const hash=/^[a-f0-9]{64}$/;

function fail(message){throw new Error(message);}
function keysOnly(object,keys,where){
  if(!object||typeof object!=="object"||Array.isArray(object))fail(where+" must be an object");
  const actual=Object.keys(object);
  if(actual.some(x=>!keys.includes(x)))fail(where+" contains unsupported fields");
}
function guardJson(value,depth=0,counter={n:0}){
  counter.n++;
  if(counter.n>5000||depth>30)fail("JSON answer exceeds object size/depth limits");
  if(value===null||typeof value==="string"||typeof value==="boolean")return;
  if(typeof value==="number"&&Number.isFinite(value))return;
  if(Array.isArray(value)){for(const v of value)guardJson(v,depth+1,counter);return;}
  if(typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype){
    for(const key of Object.keys(value))guardJson(value[key],depth+1,counter);
    return;
  }
  fail("Only finite JSON values can be scored");
}
function equalJson(a,b) {
  if(a===b)return true;
  if(a===null||b===null||typeof a!==typeof b)return false;
  if(typeof a!=="object")return false;
  const aArray=Array.isArray(a),bArray=Array.isArray(b);
  if(aArray!==bArray)return false;
  if(aArray)return a.length===b.length&&a.every((v,i)=>equalJson(v,b[i]));
  const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();
  return ka.length===kb.length&&ka.every((key,i)=>key===kb[i]&&equalJson(a[key],b[key]));
}
export function scoreAnswers(submission,fixturePack,lock){
  keysOnly(submission,["schema","protocol","task_pack_sha256","origin","task_id","pilot_id","answers"],"Submission");
  if(submission.schema!==ANSWER_SCHEMA||submission.protocol!=="HAI-001")fail("Unsupported answer schema");
  if(!lock||!hash.test(lock.pack_sha256)||submission.task_pack_sha256!==lock.pack_sha256)fail("Frozen pack hash mismatch");
  if(!["SYNTHETIC","OBSERVED"].includes(submission.origin))fail("Origin must be SYNTHETIC or OBSERVED");
  if(typeof submission.pilot_id!=="string"||!opaque.test(submission.pilot_id))fail("Pilot ID must be an anonymous 3–48-character uppercase code");
  if(!fixturePack||fixturePack.protocol!=="HAI-001"||fixturePack.version!=="0.1.0"||!Array.isArray(fixturePack.groups))fail("Invalid frozen fixtures");
  const group=fixturePack.groups.find(x=>x.task_id===submission.task_id);
  if(!group||group.cases.length!==5)fail("Task not in frozen five-case fixture pack");
  if(!Array.isArray(submission.answers)||submission.answers.length!==5)fail("All five frozen cases require explicit VALUE or MISSING responses");
  const expectedIds=new Set(group.cases.map(x=>x.case_id));
  const answers=new Map();
  for(const answer of submission.answers){
    keysOnly(answer,["case_id","kind","value"],"Answer");
    if(!expectedIds.has(answer.case_id)||answers.has(answer.case_id))fail("Unknown or duplicate case ID");
    if(!["VALUE","MISSING"].includes(answer.kind))fail("Answer kind must be VALUE or MISSING");
    if(answer.kind==="VALUE"){
      if(!Object.hasOwn(answer,"value"))fail("VALUE answer is missing its value field");
      guardJson(answer.value);
    }else if(Object.hasOwn(answer,"value"))fail("MISSING answer cannot include a value");
    answers.set(answer.case_id,answer);
  }
  const results=group.cases.map(c=>{
    const answer=answers.get(c.case_id);
    if(!answer)fail("Missing registered case ID");
    return {case_id:c.case_id,kind:answer.kind,passed:answer.kind==="VALUE"&&equalJson(answer.value,c.expected)};
  });
  const passed=results.filter(x=>x.passed).length;
  return {
    schema:SCORE_SCHEMA,protocol:"HAI-001",task_pack_sha256:lock.pack_sha256,
    task_id:submission.task_id,pilot_id:submission.pilot_id,
    source_origin:submission.origin,comparator:"JSON_STRUCTURAL_EQUALITY_V1",
    total_cases:5,passed_cases:passed,pass_rate:passed/5,
    results,
    verification_status:"FINITE_FIXTURE_COMPARISON_ONLY",
    independent_observation_verified:false,
    notes:"Computed from submitted JSON outputs and five frozen public fixtures; no code executed; neither provenance nor consent nor trial conditions were independently established."
  };
}
