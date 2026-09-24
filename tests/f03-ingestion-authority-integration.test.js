'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {createAuthorityGate}=require('../src/core/f03-ingestion-authority-integration');
const {assertProductionAuthority}=require('../src/core/f03-production-authority-record');

test('F-03 production boundary adapter validates complete authority before cursor',()=>{
  const gate=createAuthorityGate({
    authorityFactory:({fromBlock,toBlock})=>({
      segmentId:'segment:'+fromBlock+':'+toBlock,
      manifestDigest:'manifest-digest',
      checkpointDigest:'checkpoint-digest',
      generation:'g1',
      cursorBlock:toBlock,
    }),
    authorityValidator:assertProductionAuthority,
  });
  assert.equal(gate({fromBlock:101,toBlock:110,checkpointCommitted:true}).status,'AUTHORIZED');
});

test('F-03 adapter fails closed when authority is incomplete',()=>{
  const gate=createAuthorityGate({
    authorityFactory:()=>({segmentId:'s1'}),
    authorityValidator:assertProductionAuthority,
  });
  assert.throws(()=>gate({fromBlock:101,toBlock:110,checkpointCommitted:true}),/AUTHORITY_MANIFESTDIGEST_MISSING/);
});

test('F-03 adapter rejects checkpoint before authority construction',()=>{
  const gate=createAuthorityGate({
    authorityFactory:()=>{ throw new Error('MUST_NOT_BE_CALLED'); },
    authorityValidator:assertProductionAuthority,
  });
  assert.throws(()=>gate({fromBlock:101,toBlock:110,checkpointCommitted:false}),/CHECKPOINT_NOT_COMMITTED/);
});
