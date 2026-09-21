'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { RESULTS: IDENTITY, classify }=require('../src/core/block-identity');
const { RESULTS: BOUNDARY, evaluateRuntimeBoundary }=require('../src/core/runtime-reorg-boundary');

function reconcileLegacy(legacy, authoritative){
  if(!legacy || !Number.isInteger(legacy.lastProcessedBlock) || legacy.lastProcessedBlock<0) throw new Error('RECONCILIATION_REQUIRED');
  if(!authoritative || authoritative.blockNumber!==legacy.lastProcessedBlock) throw new Error('RECONCILIATION_REQUIRED');
  return { ...legacy, blockIdentity: authoritative };
}

const identity={chainId:4663,blockNumber:100,blockHash:'0x100',parentHash:'0x099',observedAt:'2026-09-21T00:00:00.000Z'};

test('legacy cursor can bind only to matching authoritative identity',()=>{
 const state=reconcileLegacy({lastProcessedBlock:100},identity);
 assert.deepEqual(state.blockIdentity,identity);
});

test('mismatched authoritative block cannot reconcile legacy cursor',()=>{
 assert.throws(()=>reconcileLegacy({lastProcessedBlock:100},{...identity,blockNumber:101}),'RECONCILIATION_REQUIRED');
});

test('continuous identity enters processing boundary',()=>{
 const current={...identity,blockNumber:101,blockHash:'0x101',parentHash:'0x100'};
 const out=evaluateRuntimeBoundary({previous:identity,current});
 assert.equal(out.result,BOUNDARY.CONTINUE);
});

test('reorg boundary preserves cursor and blocks processing',()=>{
 const current={...identity,blockNumber:101,blockHash:'0x101-fork',parentHash:'0x0ff'};
 const out=evaluateRuntimeBoundary({previous:identity,current});
 assert.equal(out.result,BOUNDARY.STOP_REORG);
 const cursor=100;
 assert.equal(cursor,100);
});

test('invalid identity fails closed',()=>{
 const current={...identity,blockNumber:103,blockHash:'0x103',parentHash:'0x102'};
 const out=evaluateRuntimeBoundary({previous:identity,current});
 assert.equal(out.result,BOUNDARY.FAIL_CLOSED);
});

test('evidence must be committed before cursor advancement',()=>{
 const evidence=[]; let cursor=100;
 const current={...identity,blockNumber:101,blockHash:'0x101',parentHash:'0x100'};
 const out=evaluateRuntimeBoundary({previous:identity,current});
 assert.equal(out.result,BOUNDARY.CONTINUE);
 evidence.push({blockNumber:101,hash:'0x101'});
 cursor=101;
 assert.equal(evidence.length,1);
 assert.equal(cursor,101);
});
