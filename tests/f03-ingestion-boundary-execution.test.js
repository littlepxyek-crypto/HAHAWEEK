'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {IngestionEngine}=require('../src/core/ingestion');
test('F-03 receives exact processed range before cursor advancement',async()=>{
  const calls=[];
  let cursorValue=100;
  const cursor={get:()=>cursorValue,advance:n=>{calls.push(['advance',n]);cursorValue=n;}};
  const engine=new IngestionEngine({
    provider:{getBlockNumber:async()=>101},
    cursor,confirmations:0,processor:async()=>{},
    processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,
    authorityGate:ctx=>{calls.push(['authority',ctx]);assert.equal(ctx.checkpointCommitted,true);assert.equal(ctx.fromBlock,101);assert.equal(ctx.toBlock,101);assert.equal(ctx.blockNumber,101);}
  });
  await engine.runOnce();
  assert.deepEqual(calls,[['authority',{checkpointCommitted:true,fromBlock:101,toBlock:101,blockNumber:101}],['advance',101]]);
});
