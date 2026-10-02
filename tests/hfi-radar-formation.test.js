'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createFormationRadarRecord } = require('../src/core/hfi-radar-formation');

function formation() {
  return {
    formation_id: 'formation:v1:test',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool',
    formation_start: '2026-09-10T09:04:36.000Z',
    formation_end: '2026-09-10T09:05:00.000Z',
    state: 'VALID',
    evidence_ids: ['ei:created', 'ei:liquidity', 'ei:swap'],
    provenance_reference: {
      chain_id: 4663,
      evidence_ids: ['ei:created', 'ei:liquidity', 'ei:swap'],
    },
  };
}

test('creates deterministic formation radar with preserved lineage', () => {
  const first = createFormationRadarRecord({ formation: formation() });
  const second = createFormationRadarRecord({ formation: formation() });

  assert.equal(first.radar_kind, 'FORMATION');
  assert.equal(first.radar_state, 'OBSERVED');
  assert.equal(first.source_state, 'VALID');
  assert.equal(first.radar_id, second.radar_id);
  assert.deepEqual(first.evidence_ids, formation().evidence_ids);
});

test('rejects non-VALID formation states', () => {
  assert.throws(
    () => createFormationRadarRecord({
      formation: { ...formation(), state: 'CANDIDATE' },
    }),
    /FORMATION_RADAR_REQUIRES_VALID_FORMATION/
  );
});

test('does not expose caller-owned evidence array', () => {
  const source = formation();
  const radar = createFormationRadarRecord({ formation: source });
  radar.evidence_ids.push('ei:mutated');
  assert.deepEqual(source.evidence_ids, ['ei:created', 'ei:liquidity', 'ei:swap']);
});
