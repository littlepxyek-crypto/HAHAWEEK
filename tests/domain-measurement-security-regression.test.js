'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  createDomainMeasurement,
} = require('../src/core/domain-measurement');

function base(overrides = {}) {
  return {
    observation_type: 'TRANSACTION_COST',
    chain_id: 4663,
    entity_ref: 'tx:0xsecurity',
    evidence_refs: ['e1'],
    provenance_ref: 'prov:1',
    event_time: '2026-09-26T00:00:00.000Z',
    observation_time: '2026-09-26T00:01:00.000Z',
    processing_time: '2026-09-26T00:02:00.000Z',
    validation_status: 'OBSERVED',
    uncertainty: 'LOW',
    admission: {
      evidence_refs: ['e1'],
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

test('security: contract transparency cannot omit evidence for a declared property', () => {
  const complete = {
    contract_ref: ['e1'],
    deployer_ref: ['e1'],
    source_verification_state: ['e1'],
    bytecode_ref: ['e1'],
    proxy_state: ['e1'],
    upgradeability_state: ['e1'],
    ownership_control_state: ['e1'],
    deployment_transaction_ref: ['e1'],
  };

  const incomplete = { ...complete };
  delete incomplete.ownership_control_state;

  assert.throws(
    () => createDomainMeasurement(base({
      observation_type: 'CONTRACT_TRANSPARENCY',
      entity_ref: 'contract:security',
      payload: {
        contract_ref: 'contract:security',
        deployer_ref: 'address:deployer',
        source_verification_state: 'VERIFIED',
        bytecode_ref: 'bytecode:1',
        proxy_state: 'NON_PROXY',
        upgradeability_state: 'UNKNOWN',
        ownership_control_state: 'DIRECTLY_EVIDENCED',
        deployment_transaction_ref: 'tx:deploy',
        measurement_version: '1',
        property_evidence: incomplete,
      },
    })),
    /property_evidence_ownership_control_state_REQUIRED/
  );
});

test('security: evidence changes create a distinct observation identity', () => {
  const a = createDomainMeasurement(base());
  const b = createDomainMeasurement(base({
    evidence_refs: ['e2'],
    admission: {
      evidence_refs: ['e2'],
      provenance_refs: ['prov:1'],
    },
  }));
  assert.notEqual(a.observation_id, b.observation_id);
});

test('security: concurrent deterministic construction has no shared mutable output', async () => {
  const observations = await Promise.all(
    Array.from({ length: 32 }, (_, index) => Promise.resolve(
      createDomainMeasurement(base({
        entity_ref: 'tx:0x' + String(index),
      }))
    ))
  );
  assert.equal(new Set(observations.map((item) => item.observation_id)).size, 32);
  for (const observation of observations) {
    assert.equal(Object.isFrozen(observation), true);
    assert.equal(Object.isFrozen(observation.payload), true);
    assert.equal(Object.hasOwn(observation, 'actor_ref'), false);
  }
});

test('security: measurement module has no acquisition, persistence, or V4 authority imports', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'core', 'domain-measurement.js'),
    'utf8'
  );
  assert.doesNotMatch(source, /require\(['"]\.\/database['"]\)/);
  assert.doesNotMatch(source, /require\(['"]\.\/state['"]\)/);
  assert.doesNotMatch(source, /require\(['"]\.\/block-cursor['"]\)/);
  assert.doesNotMatch(source, /require\(['"]\.\/authority['"]\)/);
});

test('security: conflicting validation is preserved and not latest-wins normalized', () => {
  const observation = createDomainMeasurement(base({
    observation_type: 'PROMOTIONAL_PROVENANCE',
    entity_ref: 'claim:conflict',
    validation_status: 'CONFLICTING',
    evidence_refs: ['e1', 'e2'],
    admission: {
      evidence_refs: ['e1', 'e2'],
      provenance_refs: ['prov:1', 'prov:2'],
    },
    payload: {
      source_ref: 'source:1',
      channel: 'social',
      capture_time: '2026-09-26T00:00:00.000Z',
      publication_time: null,
      claim_ref: 'claim:conflict',
      claim_content_digest: 'digest',
      promotion_relationship: null,
      provenance_chain: ['prov:1', 'prov:2'],
      measurement_version: '1',
    },
  }));
  assert.equal(observation.validation_status, 'CONFLICTING');
  assert.deepEqual(observation.evidence_refs, ['e1', 'e2']);
});
