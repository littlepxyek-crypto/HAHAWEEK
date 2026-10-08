'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTRACT_VERSION, assertL4, assertL5, evaluate } = require('../src/core/identity-l4-l5');

test('requires materially independent lineages for L4', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true},
    {source_id:'b',source_lineage_id:'lineage-a',acquisition_id:'acq-b',independence_class:'I3',relation:'controls_wallet',temporally_compatible:true}
  ],falsifier:{type:'contradiction'}}), /L4_INDEPENDENT_LINEAGES_REQUIRED/);
});
test('accepts L4 with two compatible independent lineages and a falsifier', () => {
  const result=assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'}
  ],falsifier:{type:'contradiction'}});
  assert.equal(result.level,'L4'); assert.equal(result.independent_lineages,2);
});

test('rejects L4 when lineages differ but independence is unknown', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'}
  ],falsifier:{type:'contradiction'}}), /L4_SOURCE_INDEPENDENCE_REQUIRED/);
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


test('rejects L4 with fewer than two evidence lines', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true}
  ],falsifier:{type:'contradiction'}}), /L4_INDEPENDENT_EVIDENCE_REQUIRED/);
});

test('rejects L4 when repeated observations share one lineage', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'b',source_lineage_id:'lineage-a',acquisition_id:'acq-b',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'},
    {source_id:'c',source_lineage_id:'lineage-a',acquisition_id:'acq-c',relation:'controls_wallet',temporally_compatible:true,polarity:'SUPPORT'}
  ],falsifier:{type:'contradiction'}}), /L4_INDEPENDENT_LINEAGES_REQUIRED/);
});

test('rejects L4 when a source is explicitly correlated', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',independence_class:'I2',independence_assessed:true,independence_basis:'correlated-provider',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true}
  ],falsifier:{type:'contradiction'}}), /L4_SOURCE_INDEPENDENCE_REQUIRED/);
});

test('rejects L4 without a falsifier', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true}
  ]}), /L4_FALSIFIER_REQUIRED/);
});

test('rejects L4 with temporally incompatible evidence', () => {
  assert.throws(() => assertL4({relation:'controls_wallet',evidence_lines:[
    {source_id:'a',source_lineage_id:'lineage-a',acquisition_id:'acq-a',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:true},
    {source_id:'b',source_lineage_id:'lineage-b',acquisition_id:'acq-b',independence_class:'I3',independence_assessed:true,independence_basis:'test-lineage-review',independence_rule_version:'SOURCE-INDEPENDENCE-EXECUTION-V1.1',relation:'controls_wallet',temporally_compatible:false}
  ],falsifier:{type:'contradiction'}}), /L4_TEMPORAL_COMPATIBILITY_REQUIRED/);
});

test('rejects L5 from behavioral similarity alone', () => {
  assert.throws(() => assertL5({relation:'controls_wallet',direct_proof:false,proof_type:'BEHAVIORAL_SIMILARITY',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});

test('rejects L5 from same-token purchase evidence', () => {
  assert.throws(() => assertL5({relation:'controls_wallet',direct_proof:false,proof_type:'SAME_TOKEN_PURCHASE',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});

test('rejects L5 from username/profile similarity', () => {
  assert.throws(() => assertL5({relation:'real_world_identity',direct_proof:false,proof_type:'PROFILE_SIMILARITY',proof_relation:'real_world_identity',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});

test('rejects L5 when direct proof is generalized to another relation', () => {
  assert.throws(() => assertL5({relation:'owns_social_account',direct_proof:true,proof_type:'CRYPTOGRAPHIC_OR_DIRECT_CONTROL',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true}), /L5_RELATION_SCOPE_MISMATCH/);
});

test('rejects L5 when provenance is incomplete', () => {
  assert.throws(() => assertL5({relation:'controls_wallet',direct_proof:true,proof_type:'CRYPTOGRAPHIC_OR_DIRECT_CONTROL',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:false}), /L5_PROVENANCE_REQUIRED/);
});

test('rejects L5 when temporal compatibility is false', () => {
  assert.throws(() => assertL5({relation:'controls_wallet',direct_proof:true,proof_type:'CRYPTOGRAPHIC_OR_DIRECT_CONTROL',proof_relation:'controls_wallet',temporally_compatible:false,provenance_complete:true}), /L5_TEMPORAL_COMPATIBILITY_REQUIRED/);
});

test('does not promote cross-chain same-address strings to L5', () => {
  assert.throws(() => assertL5({relation:'cross_chain_same_address',direct_proof:false,proof_type:'SAME_ADDRESS_STRING',proof_relation:'cross_chain_same_address',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});

test('does not make identity transitive from A→B and B→C', () => {
  assert.throws(() => assertL5({relation:'A_controls_C',direct_proof:false,proof_type:'TRANSITIVE_COMPOSITION',proof_relation:'A_controls_C',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});

test('rejects L5 from replayed signature semantics without direct-proof acceptance', () => {
  assert.throws(() => assertL5({relation:'controls_wallet',direct_proof:false,proof_type:'REPLAYED_SIGNATURE',proof_relation:'controls_wallet',temporally_compatible:true,provenance_complete:true}), /L5_DIRECT_PROOF_REQUIRED/);
});
