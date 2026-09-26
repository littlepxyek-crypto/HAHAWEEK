'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RULE_VERSIONS,
  createDomainMeasurement,
} = require('../src/core/domain-measurement');

function base(overrides = {}) {
  return {
    observation_type: 'TRANSACTION_COST',
    chain_id: 4663,
    entity_ref: 'tx:0xabc',
    evidence_refs: ['e2', 'e1'],
    provenance_ref: 'prov:1',
    event_time: '2026-09-26T00:00:00.000Z',
    observation_time: '2026-09-26T00:01:00.000Z',
    processing_time: '2026-09-26T00:02:00.000Z',
    validation_status: 'OBSERVED',
    uncertainty: 'LOW',
    admission: {
      evidence_refs: ['e1', 'e2', 'conversion-1'],
      provenance_refs: ['prov:1'],
    },
    payload: {
      measurement_kind: 'TRANSACTION_COST',
      transaction_ref: 'tx1',
      block_ref: 'b1',
      gas_used: '21000',
      effective_gas_price: '1000000000',
      fee_asset: 'ETH',
      measurement_version: '1',
      comparability_status: 'UNKNOWN',
    },
    ...overrides,
  };
}

test('transaction cost is deterministic and computes native fee', () => {
  const a = createDomainMeasurement(base());
  const b = createDomainMeasurement(base({
    processing_time: '2026-09-26T03:00:00.000Z',
  }));

  assert.equal(a.observation_id, b.observation_id);
  assert.equal(a.rule_version, RULE_VERSIONS.TRANSACTION_COST);
  assert.equal(a.payload.native_fee, '21000000000000');
  assert.equal(
    a.observation_id,
    'so:v1:d8c63960467d88ed60e4c4d2766557eb7f833b0ad3efa4b927df233ca7c1120f'
  );
});

test('transaction conversion requires admitted conversion evidence', () => {
  assert.throws(
    () => createDomainMeasurement(base({
      admission: { evidence_refs: ['e1', 'e2'], provenance_refs: ['prov:1'] },
      payload: {
        ...base().payload,
        conversion_ref: 'conversion-1',
        conversion_time: '2026-09-26T00:00:30.000Z',
        conversion_source: 'preserved-source',
      },
    })),
    /payload_evidence_ref_UNRESOLVED/
  );
  assert.doesNotThrow(() => createDomainMeasurement(base({
    payload: {
      ...base().payload,
      conversion_ref: 'conversion-1',
      conversion_time: '2026-09-26T00:00:30.000Z',
      conversion_source: 'preserved-source',
    },
  })));
});

test('liquidity delta accepts signed values and generic AMM depth fails closed', () => {
  const observation = createDomainMeasurement(base({
    observation_type: 'LIQUIDITY_ACTIVITY',
    entity_ref: 'pool:1',
    evidence_refs: ['e1'],
    admission: { evidence_refs: ['e1'], provenance_refs: ['prov:1'] },
    payload: {
      measurement_kind: 'LIQUIDITY_ACTIVITY',
      pool_ref: 'pool:1',
      liquidity_delta: '-1000',
    },
  }));
  assert.equal(observation.payload.liquidity_delta, '-1000');

  assert.throws(() => createDomainMeasurement(base({
    observation_type: 'LIQUIDITY_ACTIVITY',
    entity_ref: 'pool:1',
    evidence_refs: ['e1'],
    admission: { evidence_refs: ['e1'], provenance_refs: ['prov:1'] },
    payload: {
      measurement_kind: 'EXECUTABLE_DEPTH',
      pool_ref: 'pool:1',
      asset_refs: ['asset0', 'asset1'],
      snapshot_block: '100',
      quote_direction: 'asset0_to_asset1',
      quote_amount: '100',
      executable_amount: '0',
      model_id: 'CONSTANT_PRODUCT_GENERIC',
      model_version: '1',
      model_parameters_digest: 'digest',
      input_evidence_refs: ['e1'],
      measurement_version: '1',
    },
  })), /UNSUPPORTED_AMM_MODEL/);
});

test('contract transparency requires evidence for every declared property', () => {
  const observation = createDomainMeasurement(base({
    observation_type: 'CONTRACT_TRANSPARENCY',
    entity_ref: 'contract:0x1',
    evidence_refs: ['e1'],
    admission: { evidence_refs: ['e1'], provenance_refs: ['prov:1'] },
    payload: {
      contract_ref: 'contract:0x1',
      deployer_ref: 'address:0x2',
      source_verification_state: 'VERIFIED',
      bytecode_ref: 'bytecode:1',
      proxy_state: 'NON_PROXY',
      upgradeability_state: 'UNKNOWN',
      ownership_control_state: 'DIRECTLY_EVIDENCED',
      deployment_transaction_ref: 'tx:deploy',
      measurement_version: '1',
      property_evidence: {
        contract_ref: ['e1'],
        deployer_ref: ['e1'],
        source_verification_state: ['e1'],
        bytecode_ref: ['e1'],
        proxy_state: ['e1'],
        upgradeability_state: ['e1'],
        ownership_control_state: ['e1'],
        deployment_transaction_ref: ['e1'],
      },
    },
  }));
  assert.equal(observation.validation_status, 'OBSERVED');
  assert.throws(() => createDomainMeasurement(base({
    observation_type: 'CONTRACT_TRANSPARENCY',
    payload: {
      contract_ref: 'contract:0x1',
      deployer_ref: 'address:0x2',
      source_verification_state: 'VERIFIED',
      bytecode_ref: 'bytecode:1',
      proxy_state: 'NON_PROXY',
      upgradeability_state: 'UNKNOWN',
      ownership_control_state: 'DIRECTLY_EVIDENCED',
      deployment_transaction_ref: 'tx:deploy',
      measurement_version: '1',
      property_evidence: { contract_ref: ['missing'] },
    },
  })), /payload_evidence_ref_UNRESOLVED/);
});

test('promotional claims preserve CLAIMED/UNVERIFIED/CONFLICTING states', () => {
  for (const status of ['CLAIMED', 'UNVERIFIED', 'CONFLICTING']) {
    const observation = createDomainMeasurement(base({
      observation_type: 'PROMOTIONAL_PROVENANCE',
      validation_status: status,
      entity_ref: 'claim:1',
      evidence_refs: ['e1'],
      admission: { evidence_refs: ['e1'], provenance_refs: ['prov:1', 'prov-chain-1'] },
      payload: {
        source_ref: 'source:1',
        channel: 'social',
        capture_time: '2026-09-26T00:00:00.000Z',
        publication_time: null,
        claim_ref: 'claim:1',
        claim_content_digest: 'digest',
        promotion_relationship: 'DIRECT',
        provenance_chain: ['prov-chain-1'],
        measurement_version: '1',
      },
    }));
    assert.equal(observation.validation_status, status);
  }
});

test('invalid provenance, temporal leakage, and input mutation fail closed', () => {
  const input = base();
  const before = structuredClone(input);
  assert.throws(() => createDomainMeasurement({
    ...input,
    provenance_ref: 'missing-provenance',
  }), /provenance_ref_UNRESOLVED/);
  assert.deepEqual(input, before);

  assert.throws(() => createDomainMeasurement(base({
    observation_time: '2026-09-26T00:03:00.000Z',
    processing_time: '2026-09-26T00:02:00.000Z',
  })), /observation_time cannot be later than processing_time/);
});
