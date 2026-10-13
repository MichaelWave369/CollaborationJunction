import { makeEmptyRecord, validateRecord, appendEntry, counts } from "./core.mjs";
const $=id=>document.getElementById(id);
let packHash="";
let tasks=[];
let fixtureGroups=[];
let record=null;
let clockInterval=null, clockStarted=null, clockSeconds=0;
const warning=(text,good=false,element="form-status")=>{
 const box=$(element);box.textContent=text;box.classList.toggle("good",good);
};
function blank(el){while(el.firstChild)el.removeChild(el.firstChild);}
function text(tag,content,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=content;return e;}
function renderTask(){
 const id=$("task").value;
 const task=tasks.find(x=>x.id===id);
 const panel=$("task-panel");blank(panel);
 if(!task)return;
 panel.append(text("small",task.id+" · "+task.family),text("h3",task.title),text("p",task.spec),text("p",task.interface));
 panel.append(text("small",task.runtime));
 const group=fixtureGroups.find(x=>x.task_id===task.id);
 if(group){
   const details=document.createElement("details");
   const summary=document.createElement("summary");
   summary.textContent="Inspect the five public acceptance fixtures";
   const pre=document.createElement("pre");
   pre.className="wb-json";
   pre.textContent=JSON.stringify(group.cases,null,2);
   details.append(summary,pre);panel.append(details);
 }
}
function displayRecord(){
 if(!record)return;
 const summary=counts(record);
 $("reviews-count").textContent=String(summary.reviews);
 $("pilots-count").textContent=String(summary.pilots);
 $("tasks-count").textContent=String(summary.uniqueTasks);
 const list=$("ledger-items");blank(list);
 const entries=[...record.reviews.map(x=>({mode:"Review",code:x.reviewer_id,...x})),...record.pilots.map(x=>({mode:"Pilot A",code:x.pilot_id,...x}))];
 if(!entries.length)list.append(text("p","No entries yet."));
 for(const entry of entries){
  const item=document.createElement("div");
  item.append(text("b",entry.mode+" · "+entry.task_id),text("small",entry.code+" / "+(entry.mode==="Review"?"clarity "+entry.spec_clarity+", effort "+entry.estimated_effort+", ambiguity "+entry.ambiguity:entry.wall_seconds+" sec, "+entry.passed_cases+"/5 passed, checked "+String(entry.cases_crosschecked))));
  list.append(item);
 }
 $("export-json").disabled=entries.length===0;
 const hasEntries=entries.length>0;
 $("origin").disabled=hasEntries;
 $("consent").disabled=hasEntries;
}
function showMode(){
 const pilot=$("mode").value==="pilot";
 $("review-inputs").hidden=pilot;
 $("pilot-inputs").hidden=!pilot;
 $("operator-label").textContent=pilot?"Human-only pilot code":"Reviewer code";
 $("operator-id").placeholder=pilot?"PILOT_001":"RATER_001";
 $("form-status").textContent="";
}
function resetClock(){
 if(clockInterval)clearInterval(clockInterval);
 clockInterval=null;clockStarted=null;clockSeconds=0;
 $("elapsed").textContent="00:00";
 $("start-clock").disabled=false;$("stop-clock").disabled=true;
}
function showClock(){
 const seconds=Math.min(1500,Math.floor(clockSeconds));
 $("elapsed").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 if(seconds>=1500 && clockInterval){stopClock();warning("25-minute limit reached. Do not continue this pilot.");}
}
function startClock(){
 if(clockInterval)return;
 clockStarted=performance.now()-clockSeconds*1000;
 clockInterval=setInterval(()=>{clockSeconds=(performance.now()-clockStarted)/1000;showClock();},250);
 $("start-clock").disabled=true;$("stop-clock").disabled=false;
}
function stopClock(){
 if(clockInterval){clockSeconds=Math.min(1500,(performance.now()-clockStarted)/1000);clearInterval(clockInterval);clockInterval=null;clockStarted=null;}
 showClock();
 $("start-clock").disabled=false;$("stop-clock").disabled=true;
 if(clockSeconds>0)$("seconds").value=String(Math.max(1,Math.min(1500,Math.ceil(clockSeconds))));
}
function generateCode(){
 const bytes=new Uint8Array(6);
 crypto.getRandomValues(bytes);
 return "CAL_"+Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
}
function newRecord(){
 record=null;
 $("origin").disabled=false;$("consent").disabled=false;
 $("origin").value="SYNTHETIC";$("consent").checked=false;
 $("operator-id").value="";
 resetClock();
 record=makeEmptyRecord(packHash);
 displayRecord();warning("New empty session. Nothing was retained from the previous session.",true);
}
function capture(event){
 event.preventDefault();
 try{
  if(clockInterval)throw Error("Stop the stopwatch before recording a pilot");
  const origin=$("origin").value;
  if(!record||(!record.reviews.length&&!record.pilots.length)){
   record=makeEmptyRecord(packHash,origin,$("consent").checked);
  }
  const task_id=$("task").value;
  const code=$("operator-id").value.trim().toUpperCase();
  const kind=$("mode").value;
  let entry;
  if(kind==="review"){
   entry={task_id,reviewer_id:code,spec_clarity:Number($("clarity").value),estimated_effort:Number($("effort").value),ambiguity:Number($("ambiguity").value)};
  }else{
   if($("seconds").value.trim()==="")throw Error("Elapsed wall seconds are required");
   entry={task_id,pilot_id:code,condition:"A",wall_seconds:Number($("seconds").value),passed_cases:Number($("passed").value),cases_crosschecked:$("crosschecked").checked};
  }
  record=appendEntry(record,entry,kind,packHash,tasks.map(t=>t.id));
  displayRecord();
  warning("Local entry added. Export JSON to retain it; nothing has been submitted.",true);
  $("operator-id").value="";
  if(kind==="pilot"){resetClock();$("seconds").value="";$("crosschecked").checked=false;}
 }catch(err){warning(err.message);}
}
function exportFile(){
 try{
  const cleaned=validateRecord(record,packHash,tasks.map(x=>x.id));
  if(!cleaned.reviews.length&&!cleaned.pilots.length)throw Error("No entries to export");
  const bytes=JSON.stringify(cleaned,null,2)+"\n";
  const objectURL=URL.createObjectURL(new Blob([bytes],{type:"application/json"}));
  const anchor=document.createElement("a");
  anchor.href=objectURL;anchor.download="HAI001-"+cleaned.origin.toLowerCase()+"-calibration.json";
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(objectURL),1500);
  warning("Local JSON download initiated. Keep files private until a data review.",true,"import-status");
 }catch(err){warning(err.message,false,"import-status");}
}
async function importFile(event){
 try{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>1024*1024)throw Error("Import exceeds 1 MiB limit");
  const parsed=JSON.parse(await file.text());
  const sanitized=validateRecord(parsed,packHash,tasks.map(x=>x.id));
  if(record&&(record.reviews.length||record.pilots.length)&&!confirm("Replace this unsaved session with the local file?"))return;
  record=sanitized;
  $("origin").value=record.origin;$("consent").checked=record.consent_attested;
  resetClock();displayRecord();
  warning("Locally imported "+(record.reviews.length+record.pilots.length)+" entries. Import verifies structure only, not observation authenticity.",true,"import-status");
 }catch(err){warning("Import rejected: "+err.message,false,"import-status");}
 finally{event.target.value="";}
}
async function init(){
 $("add-entry").disabled=true;
 try{
  const [taskRes,fixtureRes,lockRes]=await Promise.all([fetch("./tasks.json"),fetch("./fixtures.json"),fetch("./LOCK.json")]);
  if(!taskRes.ok||!fixtureRes.ok||!lockRes.ok)throw Error("Frozen task or fixture copy unavailable");
  const [taskText,fixtureText,lockText]=await Promise.all([taskRes.text(),fixtureRes.text(),lockRes.text()]);
  const [pack,fixtures,lock]=[JSON.parse(taskText),JSON.parse(fixtureText),JSON.parse(lockText)];
  if(!globalThis.crypto?.subtle)throw Error("Web Crypto unavailable; use secure HTTPS or localhost");
  for(const [name,body] of [["tasks.json",taskText],["fixtures.json",fixtureText]]){
    const bytes=new TextEncoder().encode(body);
    const hashBytes=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
    const fileHash=Array.from(hashBytes,n=>n.toString(16).padStart(2,"0")).join("");
    if(fileHash!==lock.files?.[name])throw Error("Published "+name+" does not match frozen SHA-256 manifest");
  }
  if(!Array.isArray(pack.tasks)||pack.tasks.length!==12||!Array.isArray(fixtures.groups)||fixtures.groups.length!==12)throw Error("Unexpected task or fixture pack");
  if(!/^[a-f0-9]{64}$/.test(lock.pack_sha256))throw Error("Invalid lock manifest");
  packHash=lock.pack_sha256;tasks=pack.tasks;fixtureGroups=fixtures.groups;
  for(const item of tasks){const option=document.createElement("option");option.value=item.id;option.textContent=item.id+" | "+item.title;$("task").append(option);}
  renderTask();
  record=makeEmptyRecord(packHash);
  displayRecord();
  $("pack-status").textContent="Pack "+packHash.slice(0,12)+"… · integrity monitored by repository CI";
  $("add-entry").disabled=false;
  $("record-form").addEventListener("submit",capture);
  $("task").addEventListener("change",()=>{renderTask();resetClock();$("seconds").value="";});
  $("mode").addEventListener("change",()=>{showMode();resetClock();});
  $("make-id").addEventListener("click",()=>$("operator-id").value=generateCode());
  $("start-clock").addEventListener("click",startClock);
  $("stop-clock").addEventListener("click",stopClock);
  $("reset-clock").addEventListener("click",resetClock);
  $("export-json").addEventListener("click",exportFile);
  $("import-json").addEventListener("change",importFile);
  $("clear-session").addEventListener("click",()=>{
    if((record.reviews.length||record.pilots.length)&&!confirm("Discard all unsaved entries?"))return;
    newRecord();
  });
  showMode();
 }catch(err){
  $("pack-status").textContent="Unavailable: "+err.message;
  warning("Task pack could not load. Capture is disabled to avoid recording against unknown instructions.");
 }
}
init();
