#!/usr/bin/env node
/**
 * NO-EXECUTION submission custody CLI.
 * seal SOURCE.js METADATA.json HOLDOUT_COMMIT.json PUBLIC_SUBMISSION.json PRIVATE_NONCE.json
 * verify SOURCE.js METADATA.json HOLDOUT_COMMIT.json PUBLIC_SUBMISSION.json PRIVATE_NONCE.json
 *
 * Source/metadata/nonce MUST live outside the public repo. Public commitment
 * is generated outside too, for explicit review and separate timestamping.
 */
import {readFileSync,existsSync,statSync,realpathSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname,relative,sep,isAbsolute} from "node:path";
import {verifyLock} from "./verify-lock.mjs";
import {sealSubmission,verifySubmission} from "./submission-core.mjs";

const root=realpathSync(fileURLToPath(new URL("../../",import.meta.url)));
const inside=p=>{
 const rel=relative(root,p);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!isAbsolute(rel));
};
export function checkCustodyPaths(mode,paths){
 if(new Set(paths).size!==paths.length)throw Error("All file paths must be distinct");
 const [source,meta,holdout,pub,nonce]=paths;
 for(const p of [source,meta,holdout]){
  if(!existsSync(p))throw Error("Required input does not exist: "+p);
  if(statSync(p).size>1024*1024)throw Error("Input larger than 1 MiB: "+p);
 }
 for(const p of [source,meta]){
  if(inside(realpathSync(p)))throw Error("Private source/metadata must stay outside the public repository");
 }
 if(mode==="seal"){
  for(const p of [pub,nonce])if(existsSync(p))throw Error("Refusing to overwrite commitment/secret");
  for(const p of [pub,nonce])if(inside(realpathSync(dirname(p))))throw Error("Write commitment and private nonce outside repository, then review and publish only commitment separately");
 }else{
  for(const p of [pub,nonce])if(!existsSync(p))throw Error("Commitment and nonce missing");
 }
 if(inside(realpathSync(dirname(nonce))))throw Error("Nonce must be stored outside repository");
}
export function handle(args) {
 if(args.length!==6)throw Error("Usage: submission.mjs seal|verify SOURCE.js META.json HOLDOUT_COMMIT.json PUBLIC_SUBMISSION.json PRIVATE_NONCE.json");
 const [mode,...rest]=args;
 if(!["seal","verify"].includes(mode))throw Error("Expected seal or verify");
 const paths=rest.map(p=>resolve(p));
 checkCustodyPaths(mode,paths);
 const [sourcePath,metaPath,holdoutPath,pubPath,noncePath]=paths;
 const rawSource=readFileSync(sourcePath),rawMeta=readFileSync(metaPath);
 const holdout=JSON.parse(readFileSync(holdoutPath,"utf8"));
 const lock=verifyLock();
 if(mode==="seal"){
  const {publicCommitment,privateSecret}=sealSubmission(rawSource,rawMeta,holdout,lock);
  // Write the secret before the publishable object; no overwrite in either case.
  writeFileSync(noncePath,JSON.stringify(privateSecret,null,2)+"\n",{flag:"wx",mode:0o600});
  writeFileSync(pubPath,JSON.stringify(publicCommitment,null,2)+"\n",{flag:"wx",mode:0o600});
  return {status:publicCommitment.status,commitment_sha256:publicCommitment.commitment_sha256,
    note:"Private source, metadata, nonce remain local. Independently witness and timestamp the public commitment BEFORE hidden-case reveal."};
 }
 return verifySubmission(rawSource,rawMeta,holdout,
  JSON.parse(readFileSync(pubPath,"utf8")),JSON.parse(readFileSync(noncePath,"utf8")),lock);
}
const main=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(main) {
 try{console.log(JSON.stringify(handle(process.argv.slice(2)),null,2));}
 catch(error){console.error("SUBMISSION CUSTODY ERROR: "+error.message);process.exitCode=1;}
}
