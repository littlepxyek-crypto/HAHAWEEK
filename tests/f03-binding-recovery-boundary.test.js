'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {IngestionEngine}=require('../src/core/ingestion');
const {createAuthorityGate}=require('../src/core/f03-ingestion-authority-integration');

function engineWithAuthority({authorityFactory,expectedAuthorityFactory,authorityValidator,cursor}) {
  return new IngestionEngine({
    provider:{getBlockNumber:async()=>101},cursor,confirmations:0,
    processor:async()=>{},processorRange:async()=>{},
    batchSize:1,maxBatchesPerRun:1,
    authorityGate:createAuthorityGate({
      authorityFactory: ({fromBlock,toBlock}) => ({...authorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
      expectedAuthorityFactory: ({fromBlock,toBlock}) => ({...expectedAuthorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
      authorityValidator,
      authorityBindingValidator:()=>({status:'BOUND'})
    })
  });
}

test('F-03 boundary rejects manifest/checkpoint binding mismatch',async()=>{
  let cursorValue=100;
  const cursor={get:()=>cursorValue,advance:n=>{cursorValue=n;}};
  const engine=engineWithAuthority({
    cursor,
    authorityFactory:()=>({segmentId:'seg-101',manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:101}),
    expectedAuthorityFactory:()=>({segmentId:'seg-101',manifestDigest:'m102',checkpointDigest:'c102',generation:'g1',cursorBlock:101}),
    authorityValidator:record=>{
      if(record.manifestDigest!=='m102') throw new Error('AUTHORITY_BINDING_MISMATCH');
      return record;
    }
  });
  await assert.rejects(()=>engine.runOnce(),/AUTHORITY_BINDING_MISMATCH/);
  assert.equal(cursorValue,100);
});

test('F-03 boundary recovery reuses deterministic authority and advances once',async()=>{
  let cursorValue=100; let attempts=0; const cursor={get:()=>cursorValue,advance:n=>{cursorValue=n;}};
  const authority={segmentId:'seg-101',manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:101};
  const engine=engineWithAuthority({
    cursor,
    authorityFactory:()=>authority,
    expectedAuthorityFactory:()=>({...authority}),
    authorityValidator:record=>{
      attempts++;
      if(attempts===1) throw new Error('AUTHORITY_TRANSIENT_FAILURE');
      return record;
    }
  });
  await assert.rejects(()=>engine.runOnce(),/AUTHORITY_TRANSIENT_FAILURE/);
  assert.equal(cursorValue,100);
  const result=await engine.runOnce();
  assert.equal(result.cursor,101);
  assert.equal(cursorValue,101);
  assert.equal(attempts,2);
});
