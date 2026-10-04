'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyFormationCompleteness, STATES } = require('../src/core/formation-completeness');

const e=(event_type,evidence_id,block_number)=>({event_type,evidence_id,block_number,transaction_index:0,log_index:block_number});

test('formation completeness reaches VALID only with the complete bootstrap sequence',()=>{
  const result=classifyFormationCompleteness({
    events:[e('POOL_CREATED','e1'),e('LIQUIDITY_ADDED','e2'),e('FIRST_SWAP','e3')],
    acquisition_status:'COMPLETE',
  });
  assert.equal(result.state,'VALID');
  assert.deepEqual(STATES,[ 'OBSERVED','PARTIAL','CANDIDATE','VALID','UNKNOWN','INCONCLUSIVE' ]);
});

test('partial bootstrap is not promoted to VALID',()=>{
  assert.equal(classifyFormationCompleteness({
    events:[e('POOL_CREATED','e1'),e('LIQUIDITY_ADDED','e2')],
    acquisition_status:'COMPLETE',
  }).state,'CANDIDATE');
  assert.equal(classifyFormationCompleteness({
    events:[e('POOL_CREATED','e1')],
    acquisition_status:'COMPLETE',
  }).state,'PARTIAL');
});

test('incomplete acquisition is UNKNOWN, never negative evidence',()=>{
  for(const status of ['PARTIAL','FAILED','UNKNOWN','EXPIRED']){
    const result=classifyFormationCompleteness({events:[],acquisition_status:status});
    assert.equal(result.state,'UNKNOWN');
    assert.notEqual(result.state,'VALID');
  }
});

test('contradictory evidence is INCONCLUSIVE',()=>{
  assert.equal(classifyFormationCompleteness({
    events:[e('POOL_CREATED','e1'),e('LIQUIDITY_ADDED','e2'),e('FIRST_SWAP','e3')],
    acquisition_status:'COMPLETE',
    contradictory:true,
  }).state,'INCONCLUSIVE');
});

test('invalid acquisition status fails closed',()=>{
  assert.throws(()=>classifyFormationCompleteness({events:[],acquisition_status:'FALSE'}),/ACQUISITION_STATUS_INVALID/);
});

test('out-of-order evidence cannot become VALID',()=>{
  const result=classifyFormationCompleteness({
    events:[e('FIRST_SWAP','e3',1),e('LIQUIDITY_ADDED','e2',2),e('POOL_CREATED','e1',3)],
    acquisition_status:'COMPLETE',
  });
  assert.notEqual(result.state,'VALID');
});
