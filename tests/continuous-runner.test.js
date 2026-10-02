"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createTargetPolicy}=require("../src/acquisition/target-policy");
const {runCycle,runContinuous}=require("../src/acquisition/continuous-runner");
const policy=createTargetPolicy({allowed_protocols:["https:"],allowed_hosts:["example.com"]});
const request={request_id:"cycle-1",source_id:"source:example",source_type:"WEB",backend:"http",target:"https://example.com",policy};
test("cycle uses explicit registered backend",async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hahaweek-a9-cycle-"));const result=await runCycle({request,backends:{http:{acquire:async()=>({content_type:"text/plain",content:"ok"})}},statePath:path.join(dir,"state.json"),owner:"test-owner"});assert.equal(result.state,"RELEASED");assert.equal(JSON.parse(fs.readFileSync(path.join(dir,"state.json"),"utf8")).revision,1);});
test("continuous runner remains bounded",async()=>{const results=await runContinuous({requests:[request],backends:{http:{acquire:async()=>({content_type:"text/plain",content:"ok"})}},maxCycles:2,intervalMs:0});assert.equal(results.length,2);});
