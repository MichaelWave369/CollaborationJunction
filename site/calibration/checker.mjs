import { scoreAnswers } from "./score-core.mjs";
const $=id=>document.getElementById(id);
let fixtures,lock,receipt;
function msg(value,good=false) {
 const box=$("checker-status");
 box.textContent=value;box.classList.toggle("good",good);
}
async function sha256(bytes){
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
 return Array.from(digest,x=>x.toString(16).padStart(2,"0")).join("");
}
async function loadVerified(name){
 const response=await fetch("./"+name,{cache:"no-cache"});
 if(!response.ok)throw Error("Couldn't load "+name);
 const bytes=await response.arrayBuffer();
 const hash=await sha256(bytes);
 if(hash!==lock.files[name])throw Error("Frozen "+name+" SHA-256 mismatch");
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function init(){
 try{
  if(!globalThis.crypto?.subtle)throw Error("Secure HTTPS or localhost required for checksum verification");
  const response=await fetch("./LOCK.json",{cache:"no-cache"});
  if(!response.ok)throw Error("Frozen lock unavailable");
  lock=await response.json();
  if(!/^[a-f0-9]{64}$/.test(lock.pack_sha256))throw Error("Invalid lock hash");
  [fixtures]=await Promise.all([loadVerified("fixtures.json"),loadVerified("tasks.json")]);
  $("integrity").textContent="SHA-256 verified: "+lock.pack_sha256.slice(0,12)+"…";
  $("answer-file").disabled=false;
  msg("Ready. This page processes only local files and never sends a submission.",true);
 }catch(err){$("integrity").textContent="Verification blocked";msg(err.message);}
}
function clearResult(){
 receipt=null;
 $("download-receipt").disabled=true;
 $("score-heading").textContent="No valid answers checked";
 $("score-detail").textContent="Failed or malformed submissions receive no score.";
 $("case-results").replaceChildren();
}
function showResult(){
 $("score-heading").textContent=receipt.passed_cases+" / "+receipt.total_cases+" cases matched";
 $("score-detail").textContent=receipt.task_id+" · "+receipt.source_origin+" · "+receipt.pilot_id+" · finite-fixture comparison only";
 const root=$("case-results");root.replaceChildren();
 for(const result of receipt.results){
  const row=document.createElement("div");
  const title=document.createElement("b");title.textContent=result.case_id+": "+(result.passed?"MATCH":"NO MATCH");
  const detail=document.createElement("small");detail.textContent=result.kind==="MISSING"?"Explicit missing response":"Value compared to frozen expected output";
  row.append(title,detail);root.append(row);
 }
 $("download-receipt").disabled=false;
}
async function evaluate(file){
 clearResult();
 if(file.size>1024*1024)throw Error("JSON file exceeds 1 MiB");
 const bytes=await file.arrayBuffer();
 const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 const submission=JSON.parse(text);
 receipt={...scoreAnswers(submission,fixtures,lock),submitted_file_sha256:await sha256(bytes)};
 showResult();
 msg("Compared all five values. No code was executed and no file was uploaded.",true);
}
$("answer-file").addEventListener("change",async event=>{
 const file=event.target.files?.[0];
 if(!file)return;
 try{if(!fixtures)throw Error("Frozen fixture verification not ready");await evaluate(file);}
 catch(err){clearResult();msg("Input rejected: "+err.message);}
 finally{event.target.value="";}
});
$("download-receipt").addEventListener("click",()=>{
 if(!receipt)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)+"\n"],{type:"application/json"}));
 const a=document.createElement("a");
 a.href=url;a.download="HAI001-"+receipt.source_origin.toLowerCase()+"-case-score.json";
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 msg("Local score receipt download initiated. It does not establish observation authenticity.",true);
});
init();
