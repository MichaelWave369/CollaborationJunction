import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const json=(name)=>JSON.parse(readFileSync(new URL("../site/data/"+name+".json",import.meta.url),"utf8"));
const sources=json("sources"),atlas=json("atlas"),studies=json("studies");
const sourceIds=new Set(sources.map(s=>s.id));
test("sources are unique, HTTPS, and complete",()=>{
 assert.ok(sources.length>=8);
 assert.equal(sourceIds.size,sources.length);
 for(const s of sources){assert.match(s.id,/^[a-z0-9-]+$/);assert.ok(s.name&&s.kind&&s.year);const u=new URL(s.url);assert.equal(u.protocol,"https:");}
});
test("atlas entries have claim-level provenance and limitations",()=>{
 assert.ok(atlas.length>=5);
 assert.equal(new Set(atlas.map(r=>r.id)).size,atlas.length);
 for(const row of atlas){for(const key of ["id","name","feature","domain","type","summary","limitation","reviewed","evidence"])assert.ok(row[key],row.id+": "+key);assert.match(row.reviewed,/^\d{4}-\d{2}-\d{2}$/);assert.equal(row.evidence,"DOCUMENTED");assert.ok(Array.isArray(row.sources)&&row.sources.length);for(const ref of row.sources)assert.ok(sourceIds.has(ref),row.id+" missing "+ref);}
});
test("external research distinguishes outcomes from generalization",()=>{
 assert.ok(studies.length>=3);
 for(const item of studies){assert.ok(item.title&&item.outcome&&item.summary&&item.caveat);assert.ok(sourceIds.has(item.source));assert.ok(["positive","negative","mixed"].includes(item.direction));}
 assert.ok(studies.some(s=>s.direction==="negative"));
 assert.ok(studies.some(s=>s.direction==="mixed"));
});
test("draft experiment is explicitly not run",()=>{
 const protocol=readFileSync(new URL("../docs/HAI-001.md",import.meta.url),"utf8");
 assert.match(protocol,/NOT RUN/);
 assert.match(protocol,/human only/i);
 assert.match(protocol,/bounded model-first/i);
 assert.match(protocol,/consent/i);
});
test("pages bundle and independent workflows exist",()=>{
 for(const path of ["../site/index.html","../site/assets/style.css","../site/assets/app.js","../.github/workflows/pages.yml","../.github/workflows/ci.yml"]){assert.ok(existsSync(new URL(path,import.meta.url)),path);}
 const html=readFileSync(new URL("../site/index.html",import.meta.url),"utf8");
 for(const anchor of ["atlas","lab","method","sources"])assert.ok(html.includes('id="'+anchor+'"'));
 assert.ok(!html.includes("google-analytics"));
});
