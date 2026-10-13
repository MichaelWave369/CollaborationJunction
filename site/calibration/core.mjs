/**
 * HAI-001 local-only calibration capture helpers.
 * Schema validation is not evidence verification, consent verification, or scoring.
 * No browser APIs, storage, network, or generated-code execution.
 */
export const SCHEMA="CJ-HAI001-CALIBRATION-v1";
const ID=/^[A-Z0-9_-]{3,48}$/;
const SHA=/^[a-f0-9]{64}$/;
export function makeEmptyRecord(packHash,origin="SYNTHETIC",consentAttested=false){
  if(!SHA.test(packHash))throw Error("Invalid frozen pack hash");
  if(!["SYNTHETIC","OBSERVED"].includes(origin))throw Error("Invalid origin");
  if(origin==="OBSERVED"&&!consentAttested)throw Error("Attestation required for observed data");
  return {
    schema:SCHEMA,protocol:"HAI-001",task_pack_sha256:packHash,
    origin,consent_attested:origin==="OBSERVED",
    notes:"Local-only workbench export. No participant-identifying information should be included.",
    reviews:[],pilots:[]
  };
}
const integer=(value,min,max,label)=>{
  if(!Number.isInteger(value)||value<min||value>max)throw Error(label+" must be an integer from "+min+" to "+max);
  return value;
};
const code=(value,label)=>{
  if(typeof value!=="string"||!ID.test(value))throw Error(label+" must use 3–48 uppercase letters, digits, underscores or hyphens. Never put names or contact details in IDs.");
  return value;
};
export function validateRecord(input,packHash,taskIds){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Record must be a JSON object");
  if(input.schema!==SCHEMA||input.protocol!=="HAI-001")throw Error("Unsupported calibration record schema");
  if(input.task_pack_sha256!==packHash)throw Error("Record belongs to a different frozen task pack");
  if(!["SYNTHETIC","OBSERVED"].includes(input.origin))throw Error("Only SYNTHETIC or OBSERVED workbench records can be imported");
  if(typeof input.consent_attested!=="boolean"||(input.origin==="OBSERVED"&&!input.consent_attested))throw Error("Observed records require the consent attestation");
  if(typeof input.notes!=="string"||input.notes.length>1000)throw Error("Invalid notes field");
  if(!Array.isArray(input.reviews)||!Array.isArray(input.pilots)||input.reviews.length>5000||input.pilots.length>5000)throw Error("Invalid record array size");
  const allowed=new Set(taskIds);
  const reviews=[],pilots=[],revSeen=new Set(),pilotSeen=new Set();
  for(const r of input.reviews){
    if(!r||!allowed.has(r.task_id))throw Error("Invalid review task ID");
    const reviewer_id=code(r.reviewer_id,"Reviewer ID");
    const unique=r.task_id+"|"+reviewer_id;
    if(revSeen.has(unique))throw Error("Duplicate review for task and evaluator");revSeen.add(unique);
    reviews.push({task_id:r.task_id,reviewer_id,
      spec_clarity:integer(r.spec_clarity,1,5,"Clarity"),
      estimated_effort:integer(r.estimated_effort,1,5,"Effort"),
      ambiguity:integer(r.ambiguity,1,5,"Ambiguity")});
  }
  for(const p of input.pilots){
    if(!p||!allowed.has(p.task_id))throw Error("Invalid pilot task ID");
    const pilot_id=code(p.pilot_id,"Pilot ID");
    const unique=p.task_id+"|"+pilot_id;
    if(pilotSeen.has(unique))throw Error("Duplicate pilot for task and evaluator");pilotSeen.add(unique);
    if(p.condition!=="A")throw Error("Calibration captures human-only condition A, not an AI trial");
    if(typeof p.cases_crosschecked!=="boolean")throw Error("Cross-check flag must be true or false");
    pilots.push({task_id:p.task_id,pilot_id,condition:"A",
      wall_seconds:integer(p.wall_seconds,1,1500,"Elapsed seconds"),
      passed_cases:integer(p.passed_cases,0,5,"Passed cases"),
      cases_crosschecked:p.cases_crosschecked});
  }
  return {
    schema:SCHEMA,protocol:"HAI-001",task_pack_sha256:packHash,
    origin:input.origin,consent_attested:input.origin==="OBSERVED"?true:false,
    notes:input.notes,reviews,pilots
  };
}
export function appendEntry(record,entry,kind,packHash,taskIds){
  const clean=validateRecord(record,packHash,taskIds);
  if(kind==="review")clean.reviews.push(entry);
  else if(kind==="pilot")clean.pilots.push(entry);
  else throw Error("Invalid entry kind");
  return validateRecord(clean,packHash,taskIds);
}
export function counts(record) {
  return {reviews:record.reviews.length,pilots:record.pilots.length,uniqueTasks:new Set([...record.reviews,...record.pilots].map(x=>x.task_id)).size};
}
