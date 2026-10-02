"use strict";
const fs=require("node:fs");
const dns=require("node:dns").promises;
const {createTargetPolicy}=require("../src/acquisition/target-policy");
const {runCycle}=require("../src/acquisition/continuous-runner");
const {acquireHttp}=require("../src/acquisition/http-backend");

async function main(){
  const target=process.env.A9_TARGET||"https://example.com";
  const url=new URL(target);
  const addresses=await dns.lookup(url.hostname,{all:true,verbatim:true});
  const policy=createTargetPolicy({allowed_protocols:["https:"],allowed_hosts:["example.com"],timeout_ms:10000,max_response_bytes:1024*1024});
  const result=await runCycle({
    request:{request_id:"a9-live-example",source_id:"source:example",source_type:"WEB",backend:"http",target,policy},
    backends:{http:{acquire:acquireHttp}},
    owner:"github-a9-runtime",
    statePath:"/tmp/hahaweek-a9-runtime-state.json"
  });
  if(result.state!=="RELEASED"||result.result.status!=="OBSERVED")throw new Error("A9_LIVE_RUNTIME_NOT_VERIFIED");
  const evidence={verification_class:"A9_RUNTIME",state:result.state,acquisition_status:result.result.status,execution_id:result.execution_id,acquisition_id:result.result.acquisition_id,content_hash:result.result.content_hash,target,resolved_addresses:addresses.map(x=>x.address),external_network:true,external_actions:false,publication_executed:false};
  fs.writeFileSync("/tmp/hahaweek-a9-runtime-evidence.json",JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify(evidence,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
