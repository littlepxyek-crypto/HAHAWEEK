'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {IngestionEngine}=require('../src/core/ingestion');
const {createAuthorityGate}=require('../src/core/f03-ingestion-authority-integration');
const {assertProductionAuthority}=require('../src/core/f03-production-authority-record');

test('F-03 production boundary consumes complete authority record before cursor',async()=>{
  const events=[]; let cursorValue=100;
  const cursor={get:()=>cursorValue,advance:n=>{events.push(['cursor',n]);cursorValue=n;}};
  const authorityGate=createAuthorityGate({
    authorityFactory:({toBlock})=>({segmentId:'seg-101',manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:toBlock}),
    expectedAuthorityFactory:({toBlock})=>({segmentId:'seg-101',manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:toBlock}),
    authorityValidator:record=>{events.push(['authority',record.cursorBlock]); return assertProductionAuthority(record);},
    authorityBindingValidator:()=>({status:'BOUND'})
  });
  const engine=new IngestionEngine({
    provider:{getBlockNumber:async()=>101},cursor,confirmations:0,
    processor:async()=>{},processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,authorityGate
  });
  const result=await engine.runOnce();
  assert.equal(result.cursor,101);
  assert.equal(cursorValue,101);
  assert.equal(events[0][0],'authority');
  assert.equal(events[1][0],'cursor');
});

test('F-03 production boundary rejects incomplete authority before cursor',async()=>{
  let cursorValue=100;
  const cursor={get:()=>cursorValue,advance:n=>{cursorValue=n;}};
  const authorityGate=createAuthorityGate({
    authorityFactory:()=>({segmentId:'seg-101',cursorBlock:101}),
    expectedAuthorityFactory:()=>({segmentId:'seg-101',cursorBlock:101}),
    authorityValidator:assertProductionAuthority,
    authorityBindingValidator:()=>({status:'BOUND'})
  });
  const engine=new IngestionEngine({
    provider:{getBlockNumber:async()=>101},cursor,confirmations:0,
    processor:async()=>{},processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,authorityGate
  });
  await assert.rejects(()=>engine.runOnce(),/AUTHORITY_MANIFESTDIGEST_MISSING/);
  assert.equal(cursorValue,100);
});
