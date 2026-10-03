'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTRACT_VERSION, assertL4, assertL5, evaluate } = require('../src/core/identity-l4-l5');

test('requires materially independent lineages for L4', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true},
    {source_id:'b',source_lineage_id:'lineage-a',acquisition_id:'acq-b',relation:'controls_wallet',temporally_compatible:true}
  ],falsifier:{type:'contradiction'}}), /L4_INDEPENDENT_LINEAGES_REQUIRED/);
});
test('accepts L4 with two compatible independent lineages and a falsifier', () => {
  const result=assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'}
  ],falsifier:{type:'contradiction'}});
  assert.equal(result.level,'L4'); assert.equal(result.independent_lineages,2);
});
test('rejects L4 when evidence lines directly contradict', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',relation:'controls_wallet',temporally_compatible:true,polarity:'CONTRADICT'}
  ],falsifier:{type:'contradiction'}}), /IDENTITY_DIRECT_CONTRADICTION/);
});
test('does not treat a wallet signature as L5 identity proof', () => {
  assert.throws(() => assertL5({relation:'real_world_identity',direct_proof:false,proof_type:'SIGNED_MESSAGE',proof_relation:'real_world_identity',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});
test('requires L5 proof to be relation-specific', () => {
  assert.throws(() => assertL5({relation:'real_world_identity',direct_proof:true,proof_type:'CRYPTOGRAPHIC_OR_DIRECT_CONTROL',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true}), /L5_RELATION_SCOPE_MISMATCH/);
});
test('accepts relation-specific direct proof for L5', () => {
  const result=assertL5({relation:'controls_wallet',direct_proof:true,proof_type:'CRYPTOGRAPHIC_OR_DIRECT_CONTROL',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true});
  assert.equal(result.level,'L5');
});
test('keeps lower identity levels non-promotional', () => {
  assert.deepEqual(evaluate({level:'L3',relation:'controls_wallet'}),{level:'L3',relation:'controls_wallet'});
});
test('freezes the contract version', () => assert.equal(CONTRACT_VERSION,'IDENTITY-L4-L5-EXECUTABLE-V1'));
