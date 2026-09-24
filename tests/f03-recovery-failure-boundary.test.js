'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {IngestionEngine}=require('../src/core/ingestion');

test('F-03 authority failure prevents cursor advancement',async()=>{
  let cursorValue=100;
  const advances=[];
  const cursor={get:()=>cursorValue,advance:n=>{advances.push(n);cursorValue=n;}};
  const engine=new IngestionEngine({
    provider:{getBlockNumber:async()=>101},
    cursor,confirmations:0,processor:async()=>{},processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,
    authorityGate:()=>{throw new Error('AUTHORITY_REJECTED');}
  });
  await assert.rejects(()=>engine.runOnce(),/AUTHORITY_REJECTED/);
  assert.equal(cursorValue,100);
  assert.deepEqual(advances,[]);
});

test('F-03 recovery can retry the same block after authority failure',async()=>{
  let cursorValue=100; let reject=true; const seen=[];
  const cursor={get:()=>cursorValue,advance:n=>{cursorValue=n;}};
  const engine=new IngestionEngine({
    provider:{getBlockNumber:async()=>101},
    cursor,confirmations:0,processor:async()=>{},processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,
    authorityGate:({toBlock})=>{seen.push(toBlock);if(reject)throw new Error('AUTHORITY_REJECTED');}
  });
  await assert.rejects(()=>engine.runOnce(),/AUTHORITY_REJECTED/);
  reject=false;
  const result=await engine.runOnce();
  assert.equal(result.cursor,101);
  assert.deepEqual(seen,[101,101]);
});
