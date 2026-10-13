#!/usr/bin/env node
/**
 * Offline seal / reveal-check CLI. No candidate code ever executed.
 * Usage:
 * node scripts/hai-001/holdout.mjs commit PRIVATE_CASES.json PUBLIC_COMMIT.json SECRET_OUTSIDE_REPO.json
 * node scripts/hai-001/holdout.mjs verify PRIVATE_CASES.json PUBLIC_COMMIT.json SECRET_OUTSIDE_REPO.json
 */
import { readFileSync, realpathSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLock, PACK_DIR } from "./verify-lock.mjs";
import { sealChallenge,verifyReveal } from "./holdout-core.mjs";
const repoRoot=realpathSync(fileURLToPath(new URL("../../",import.meta.url)));
const insideRepo=path=>{
 const p=relative(repoRoot,path);
 return p===""||(!p.startsWith(".."+sep)&&p!==".."&&!p.startsWith("/")&&!p.startsWith("\\"));
};
export function checkFilePlacement(mode,cases,publicPath,secretPath){
 if(cases===publicPath||cases===secretPath||publicPath===secretPath)throw Error("All paths must be distinct");
 if(insideRepo(realpathSync(cases)))throw Error("Private test cases must live outside this repository");
 if(insideRepo(realpathSync(dirname(secretPath))))throw Error("Private nonce file must live outside this repository");
 if(mode==="commit"){
  for(const x of [publicPath,secretPath])if(existsSync(x))throw Error("Refusing to overwrite an existing commitment or secret");
 }else{
  for(const x of [publicPath,secretPath])if(!existsSync(x))throw Error("Commitment and secret files are required");
 }
}
export function handle(args){
 if(args.length!==4)throw Error("Usage: holdout.mjs commit|verify PRIVATE_CASES.json PUBLIC_COMMIT.json PRIVATE_SECRET.json");
 const [mode,inFile,outFile,secretFile]=args;
 if(!["commit","verify"].includes(mode))throw Error("Command must be commit or verify");
 const input=resolve(inFile),publicPath=resolve(outFile),secretPath=resolve(secretFile);
 if(!existsSync(input)||statSync(input).size>1024*1024)throw Error("Private input missing or larger than 1 MiB");
 checkFilePlacement(mode,input,publicPath,secretPath);
 const raw=readFileSync(input);
 const lock=verifyLock();
 const fixtures=JSON.parse(readFileSync(resolve(PACK_DIR,"fixtures.json"),"utf8"));
 if(mode==="commit"){
  const {publicCommitment,privateSecret}=sealChallenge(raw,fixtures,lock);
  // Secret is stored first; if public write fails, the unused secret remains private.
  writeFileSync(secretPath,JSON.stringify(privateSecret,null,2)+"\n",{flag:"wx",mode:0o600});
  writeFileSync(publicPath,JSON.stringify(publicCommitment,null,2)+"\n",{flag:"wx",mode:0o600});
  return {status:"SEALED_NOT_EVALUATED",commitment_sha256:publicCommitment.commitment_sha256,message:"Only publish the public commitment after review. Keep private cases and secret offline/outside repo."};
 }
 const publicCommitment=JSON.parse(readFileSync(publicPath,"utf8"));
 const privateSecret=JSON.parse(readFileSync(secretPath,"utf8"));
 return verifyReveal(raw,publicCommitment,privateSecret,fixtures,lock);
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL("file://"+process.argv[1]));
if(isMain) {
 try{console.log(JSON.stringify(handle(process.argv.slice(2)),null,2));}
 catch(err){console.error("HOLDOUT ERROR: "+err.message);process.exitCode=1;}
}
