/**
 * Compares human-entered pilot totals to original answer-file outputs.
 * Does not verify independence, human-only compliance, consent or provenance.
 */
import { readFileSync,statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluateCalibration } from "./calibration-check.mjs";
import { scoreFile } from "./score-answers.mjs";

export function audit(calibration,scores){
  const checked=evaluateCalibration(calibration);
  if(calibration.origin==="TEMPLATE")throw new Error("Empty template is not a calibration session");
  const matched=new Map();
  const duplicates=[];
  for(const s of scores){
    const key=s.task_id+"|"+s.pilot_id;
    if(matched.has(key)){duplicates.push(key);continue;}
    matched.set(key,s);
  }
  if(duplicates.length)throw new Error("Duplicate score files for pilots: "+duplicates.join(","));
  const findings=calibration.pilots.map(p=>{
    const s=matched.get(p.task_id+"|"+p.pilot_id);
    const available=Boolean(s);
    const originMatches=available&&s.source_origin===calibration.origin;
    const countMatches=available&&s.passed_cases===p.passed_cases;
    const acceptable=available&&originMatches&&countMatches;
    return {
      task_id:p.task_id,pilot_id:p.pilot_id,entered_score:p.passed_cases,
      scorer_score:available?s.passed_cases:null,receipt_present:available,
      origin_matches:originMatches,score_matches:countMatches,
      operator_crosscheck_claim:p.cases_crosschecked,
      result:acceptable?"CASE_OUTPUTS_AGREE":"NEEDS_REVIEW"
    };
  });
  const orphanScores=scores.filter(s=>!calibration.pilots.some(p=>p.task_id===s.task_id&&p.pilot_id===s.pilot_id)).map(s=>({task_id:s.task_id,pilot_id:s.pilot_id}));
  return {
    schema:"CJ-HAI001-CALIBRATION-AUDIT-v1",pack_sha256:checked.pack_sha256,
    status:calibration.origin==="SYNTHETIC"?"SYNTHETIC_NOT_EVIDENCE":"UNVERIFIED_SELF_REPORTED_OBSERVATIONS",
    matched:findings.filter(x=>x.result==="CASE_OUTPUTS_AGREE").length,
    pending:findings.filter(x=>x.result==="NEEDS_REVIEW").length,
    findings,orphan_scores:orphanScores,
    conclusion:"An agreement of score counts verifies only computation from submitted case outputs; it does not prove those outputs came from the described human, model, elapsed time or authorized session."
  };
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(isMain){
  try{
    if(process.argv.length<4)throw Error("Usage: node scripts/hai-001/audit-calibration.mjs CALIBRATION.json ANSWERS_1.json [ANSWERS_2.json ...]");
    const file=process.argv[2];
    if(statSync(file).size>1024*1024)throw Error("Calibration file exceeds 1 MiB");
    const calibration=JSON.parse(readFileSync(file,"utf8"));
    const scores=process.argv.slice(3).map(scoreFile);
    const result=audit(calibration,scores);
    console.log(JSON.stringify(result,null,2));
    if(result.pending||result.orphan_scores.length)process.exitCode=2;
  }catch(err){console.error("AUDIT FAILED: "+err.message);process.exitCode=1;}
}
