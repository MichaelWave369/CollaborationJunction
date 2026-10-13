#!/usr/bin/env node
/**
 * Read-only offline sequencing screen.
 * node scripts/hai-001/custody-sequence.mjs TIMELINE.json HOLDOUT_PUBLIC.json SUBMISSION_PUBLIC.json
 * Does not execute candidate code, query external URLs, verify witnesses, or authorize reveal.
 */
import {readFileSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {verifyLock} from "./verify-lock.mjs";
import {inspectSequence} from "./custody-sequence-core.mjs";
function loadSmall(path) {
 if(statSync(path).size>1024*1024)throw Error("Input larger than 1 MiB");
 return readFileSync(path);
}
export function inspectFiles(timelinePath,holdoutPath,submissionPath) {
 const rawTimeline=loadSmall(timelinePath);
 const record=JSON.parse(rawTimeline.toString("utf8"));
 return inspectSequence(record,loadSmall(holdoutPath),loadSmall(submissionPath),verifyLock());
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(isMain){
 try{
  if(process.argv.length!==5)throw Error("Usage: custody-sequence.mjs TIMELINE.json HOLDOUT_PUBLIC.json SUBMISSION_PUBLIC.json");
  console.log(JSON.stringify(inspectFiles(...process.argv.slice(2)),null,2));
 }catch(err){console.error("CUSTODY SEQUENCE FAILED: "+err.message);process.exitCode=1;}
}
