'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectPoolBootstrap } = require('../src/core/pool-bootstrap-formation');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');
function event(event_type, evidence_id, block_number, transaction_index, log_index) { return { event_type, evidence_id, chain_id: 4663, pool_id: '0xpool', block_number, transaction_index, log_index }; }
test('valid Pool Bootstrap formation integrates into the frozen DERIVED reference boundary', () => {
  const formationResult = detectPoolBootstrap([event('SWAP','ei:swap',102,0,0),event('POOL_CREATED','ei:create',100,0,1),event('LIQUIDITY_ADDED','ei:liquidity',101,0,2)]);
  assert.equal(formationResult.state,'VALID');
  const reference = createFormationEvidenceReference(formationResult.formation);
  assert.equal(reference.evidence_class,'DERIVED');
  assert.equal(reference.formation_id,formationResult.formation.formation_id);
  assert.equal(reference.formation_rule_version,'pool-bootstrap-v1');
  assert.deepEqual(reference.evidence_ids,['ei:create','ei:liquidity','ei:swap']);
  assert.deepEqual(reference.event_order,formationResult.formation.event_order);
  assert.deepEqual(reference.graph_reference,formationResult.formation.graph_reference);
  assert.deepEqual(reference.provenance_reference,formationResult.formation.provenance_reference);
});
test('candidate formation cannot cross the DERIVED reference boundary', () => {
  const formationResult = detectPoolBootstrap([event('POOL_CREATED','ei:create',100,0,1),event('LIQUIDITY_ADDED','ei:liquidity',101,0,2)]);
  assert.equal(formationResult.state,'CANDIDATE'); assert.equal(formationResult.formation,null);
  assert.throws(()=>createFormationEvidenceReference(formationResult.formation),/formation evidence reference requires formation/);
});
test('integration preserves authority separation', () => {
  const formationResult = detectPoolBootstrap([event('POOL_CREATED','ei:create',100,0,1),event('LIQUIDITY_ADDED','ei:liquidity',101,0,2),event('SWAP','ei:swap',102,0,0)]);
  const reference = createFormationEvidenceReference(formationResult.formation);
  assert.equal(reference.evidence_class,'DERIVED');
  assert.equal(Object.prototype.hasOwnProperty.call(reference,'response_payload'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(reference,'request'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(reference,'cursor'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(reference,'runtime_state'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(reference,'v4_authority'),false);
});
