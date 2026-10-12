import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export const PACK_DIR = fileURLToPath(new URL("../../protocols/HAI-001/v0.1.0/", import.meta.url));
const digest = data => createHash("sha256").update(data).digest("hex");
const names = ["conditions.json","fixtures.json","rubric.json","tasks.json"];

export function calculateLock(root=PACK_DIR) {
  const files={};
  for(const name of names) files[name]=digest(readFileSync(join(root,name)));
  const chain=names.map(name=>name+"\t"+files[name]+"\n").join("");
  return {schema:"CJ-HAI001-LOCK-v1",version:"0.1.0",algorithm:"SHA-256",files,pack_sha256:digest(chain)};
}
export function verifyLock(root=PACK_DIR) {
  const expected=JSON.parse(readFileSync(join(root,"LOCK.json"),"utf8"));
  const actual=calculateLock(root);
  assert.deepEqual(actual,expected,"Frozen HAI-001 task pack has changed. Amend via a new protocol version; do not rewrite locked v0.1.0.");
  return actual;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]))) {
  try {const result=verifyLock();console.log("LOCK VERIFIED HAI-001 "+result.pack_sha256);}
  catch(err){console.error(err.message);process.exitCode=1;}
}
