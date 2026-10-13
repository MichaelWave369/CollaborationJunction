import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PACK_DIR,verifyLock } from "./verify-lock.mjs";
import { scoreAnswers } from "../../site/calibration/score-core.mjs";

export const MAX_BYTES=1024*1024;
export function readSubmission(file) {
  if(statSync(file).size>MAX_BYTES)throw new Error("Answer file exceeds 1 MiB");
  const raw=readFileSync(file);
  const parsed=JSON.parse(raw.toString("utf8"));
  return {parsed,hash:createHash("sha256").update(raw).digest("hex")};
}
export function scoreFile(file) {
  const lock=verifyLock();
  const fixtures=JSON.parse(readFileSync(join(PACK_DIR,"fixtures.json"),"utf8"));
  const {parsed,hash}=readSubmission(file);
  return {...scoreAnswers(parsed,fixtures,lock),submitted_file_sha256:hash};
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(isMain){
  try{
    if(process.argv.length!==3)throw new Error("Usage: node scripts/hai-001/score-answers.mjs ANSWERS.json");
    console.log(JSON.stringify(scoreFile(process.argv[2]),null,2));
  }catch(err){console.error("ANSWER SCORE FAILED: "+err.message);process.exitCode=1;}
}
