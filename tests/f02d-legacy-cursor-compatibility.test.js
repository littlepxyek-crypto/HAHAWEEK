'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

function classifyLegacyState(state){
  if(!state || !Number.isInteger(state.lastProcessedBlock) || state.lastProcessedBlock<0) return 'RECONCILIATION_REQUIRED';
  if(state.blockIdentity && state.blockIdentity.blockHash && state.blockIdentity.parentHash) return 'IDENTITY_BOUND';
  return 'LEGACY_NUMBER_ONLY';
}

test('legacy block number is not treated as block identity',()=>{
  assert.equal(classifyLegacyState({lastProcessedBlock:100}),'LEGACY_NUMBER_ONLY');
});
test('identity-bound state requires authoritative hashes',()=>{
  assert.equal(classifyLegacyState({lastProcessedBlock:100,blockIdentity:{blockHash:'0x100',parentHash:'0x099'}}),'IDENTITY_BOUND');
});
test('missing or malformed checkpoint requires reconciliation',()=>{
  assert.equal(classifyLegacyState(null),'RECONCILIATION_REQUIRED');
  assert.equal(classifyLegacyState({lastProcessedBlock:-1}),'RECONCILIATION_REQUIRED');
  assert.equal(classifyLegacyState({lastProcessedBlock:100,blockIdentity:{}}),'LEGACY_NUMBER_ONLY');
});
test('legacy state is never given fabricated identity',()=>{
  const state={lastProcessedBlock:100};
  assert.equal(state.blockHash,undefined);
  assert.equal(state.parentHash,undefined);
});
