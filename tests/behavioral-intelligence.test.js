'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RULE_VERSION,
  ALGORITHM_VERSION,
  createFinding,
  analyzeDeployerFingerprint,
  buildWalletClusters,
  analyzeFundFlow,
  findTemporalCoordination,
} = require('../src/analytics/behavioral-intelligence');

const ADMISSION = {
  evidence_refs: [
    'ev:1', 'ev:2', 'ev:3', 'ev:4', 'ev:5', 'ev:6', 'ev:7', 'ev:8',
  ],
};

test('finding identity is deterministic and evidence-bound', () => {
  const input = {
    finding_type: 'TEST_FINDING',
    subject: { type: 'WALLET', id: 'wallet:a' },
    status: 'DERIVED',
    evidence_refs: ['ev:1', 'ev:2'],
    temporal_scope: {
      as_of: null,
      observed_from: '2026-10-01T00:00:00.000Z',
      observed_to: '2026-10-01T00:01:00.000Z',
    },
    rule_version: RULE_VERSION,
    algorithm_version: ALGORITHM_VERSION,
    confidence: 'LOW',
    uncertainty: ['test only'],
    methodology: 'deterministic test',
    admission: ADMISSION,
  };

  const a = createFinding(input);
  const b = createFinding(structuredClone(input));
  assert.equal(a.finding_id, b.finding_id);
  assert.equal(a.evidence_refs.length, 2);
  assert.equal(Object.hasOwn(a, 'score'), false);
  assert.equal(Object.hasOwn(a, 'ranking'), false);
});

test('unresolved evidence is rejected', () => {
  assert.throws(() => createFinding({
    finding_type: 'TEST_FINDING',
    subject: { type: 'WALLET', id: 'wallet:a' },
    status: 'DERIVED',
    evidence_refs: ['ev:not-admitted'],
    temporal_scope: { as_of: null, observed_from: null, observed_to: null },
    rule_version: RULE_VERSION,
    algorithm_version: ALGORITHM_VERSION,
    confidence: 'LOW',
    uncertainty: [],
    methodology: 'test',
    admission: ADMISSION,
  }), /EVIDENCE_REF_UNRESOLVED/);
});

test('deployer fingerprint is deterministic, descriptive, and as-of bounded', () => {
  const input = {
    deployer_id: 'deployer:a',
    as_of: '2026-10-03T00:00:00.000Z',
    admission: ADMISSION,
    launches: [
      {
        launch_id: 'l2',
        deployer_id: 'deployer:a',
        observed_at: '2026-10-02T00:10:00.000Z',
        evidence_refs: ['ev:2'],
        funding_source_ids: ['funder:x', 'funder:y'],
        exit_pattern: 'STAGED',
        cluster_wallet_count: 10,
        hold_duration_seconds: 120,
      },
      {
        launch_id: 'l1',
        deployer_id: 'deployer:a',
        observed_at: '2026-10-01T00:00:00.000Z',
        evidence_refs: ['ev:1'],
        funding_source_ids: ['funder:x'],
        exit_pattern: 'STAGED',
        cluster_wallet_count: 8,
        hold_duration_seconds: 60,
      },
      {
        launch_id: 'other',
        deployer_id: 'deployer:b',
        observed_at: '2026-10-02T00:20:00.000Z',
        evidence_refs: ['ev:3'],
      },
    ],
  };

  const a = analyzeDeployerFingerprint(input);
  const b = analyzeDeployerFingerprint(structuredClone(input));
  assert.deepEqual(a.fingerprint, b.fingerprint);
  assert.equal(a.fingerprint.launch_count, 2);
  assert.equal(a.fingerprint.median_launch_interval_seconds, 87000);
  assert.equal(a.fingerprint.average_cluster_wallet_count, 9);
  assert.equal(a.finding.status, 'DERIVED');
  assert.equal(a.finding.confidence, 'LOW');
  assert.match(a.finding.uncertainty[0], /ownership/);
});

test('deployer fingerprint rejects future observations', () => {
  assert.throws(() => analyzeDeployerFingerprint({
    deployer_id: 'deployer:a',
    as_of: '2026-10-01T00:00:00.000Z',
    admission: ADMISSION,
    launches: [{
      launch_id: 'future',
      deployer_id: 'deployer:a',
      observed_at: '2026-10-01T00:00:01.000Z',
      evidence_refs: ['ev:1'],
    }],
  }), /FUTURE_OBSERVATION_RELATIVE_TO_AS_OF/);
});

test('wallet clusters use deterministic connected components without ownership inference', () => {
  const result = buildWalletClusters({
    admission: ADMISSION,
    wallet_ids: ['w3', 'w1', 'w2', 'w4'],
    relationships: [
      { from: 'w1', to: 'w2', type: 'SHARED_FUNDER', evidence_refs: ['ev:1'] },
      { from: 'w2', to: 'w3', type: 'COMMON_EXIT', evidence_refs: ['ev:2'] },
      { from: 'w4', to: 'w4', type: 'SYNCHRONIZED_ENTRY', evidence_refs: ['ev:3'] },
    ],
  });

  assert.equal(result.clusters.length, 2);
  assert.deepEqual(result.clusters[0].members, ['w1', 'w2', 'w3']);
  assert.deepEqual(result.clusters[1].members, ['w4']);
  assert.equal(result.clusters[0].size, 3);
  assert.match(result.limitations[0], /ownership/);
});

test('wallet cluster rejects unresolved wallet relationships', () => {
  assert.throws(() => buildWalletClusters({
    admission: ADMISSION,
    wallet_ids: ['w1'],
    relationships: [{ from: 'w1', to: 'w2', type: 'SHARED_FUNDER', evidence_refs: ['ev:1'] }],
  }), /RELATIONSHIP_WALLET_UNRESOLVED/);
});

test('fund flow is deterministic and evidence-linked', () => {
  const result = analyzeFundFlow({
    admission: ADMISSION,
    as_of: '2026-10-03T00:00:00.000Z',
    transfers: [
      { from: 'funder', to: 'w1', asset: 'ETH', amount: 1, event_time: '2026-10-01T00:00:00.000Z', evidence_refs: ['ev:1'] },
      { from: 'w1', to: 'w2', asset: 'ETH', amount: 0.5, event_time: '2026-10-01T00:01:00.000Z', evidence_refs: ['ev:2'] },
    ],
  });

  assert.deepEqual(result.nodes, ['funder', 'w1', 'w2']);
  assert.equal(result.edges.length, 2);
  assert.deepEqual(result.adjacency.funder[0].to, 'w1');
  assert.deepEqual(result.evidence_refs, ['ev:1', 'ev:2']);
});

test('temporal proximity remains an observation, not a coordination verdict', () => {
  const result = findTemporalCoordination({
    admission: ADMISSION,
    as_of: '2026-10-03T00:00:00.000Z',
    window_seconds: 60,
    events: [
      { entity_id: 'w1', event_time: '2026-10-01T00:00:00.000Z', evidence_refs: ['ev:1'] },
      { entity_id: 'w2', event_time: '2026-10-01T00:00:30.000Z', evidence_refs: ['ev:2'] },
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].status, 'OBSERVED');
  assert.equal(result[0].confidence, 'LOW');
  assert.match(result[0].uncertainty[0], /does not establish coordination/);
});

test('behavioral utility has no persistence or authority mutation surface', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../src/analytics/behavioral-intelligence'), 'utf8');
  assert.doesNotMatch(source, /\b(?:INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|CREATE TABLE|DROP TABLE)\b/i);
  assert.doesNotMatch(source, /cursor|checkpoint|manifest/i);
});
