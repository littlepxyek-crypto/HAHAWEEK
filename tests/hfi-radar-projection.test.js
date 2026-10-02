'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createHfiRadarProjection } = require('../src/core/hfi-radar-projection');

test('dispatches Candidate projection through the Formation Engine boundary', () => {
  const result = createHfiRadarProjection({
    kind: 'CANDIDATE',
    events: [
      {
        event_type: 'POOL_CREATED',
        evidence_id: 'ei:created',
        chain_id: 4663,
        pool_id: '0xpool',
        block_number: 100,
        transaction_index: 0,
        log_index: 1,
        event_time: '2026-09-10T09:04:36.000Z',
      },
      {
        event_type: 'LIQUIDITY_ADDED',
        evidence_id: 'ei:liquidity',
        chain_id: 4663,
        pool_id: '0xpool',
        block_number: 100,
        transaction_index: 0,
        log_index: 2,
        event_time: '2026-09-10T09:04:40.000Z',
      },
    ],
  });

  assert.equal(result.radar_state, 'CANDIDATE');
  assert.equal(result.radar_kind, 'CANDIDATE');
});

test('wraps the frozen Validated Radar without changing its state semantics', () => {
  const validated = {
    radar_id: 'radar:v1:confirmed',
    state: 'VERIFIED',
    summary_id: 'intelligence-summary:v1:test',
    intelligence_id: 'intelligence:v1:test',
    formation_id: 'formation:v1:test',
    outcome_id: 'outcome:v1:test',
    validation_id: 'validation:v1:test',
    evidence_ids: ['ei:created', 'ei:liquidity', 'ei:swap'],
  };

  const result = createHfiRadarProjection({
    kind: 'VALIDATED',
    validated_radar: validated,
  });

  assert.equal(result.radar_kind, 'VALIDATED');
  assert.equal(result.radar_state, 'VALIDATED');
  assert.equal(result.validated_radar_id, validated.radar_id);
  assert.equal(result.lineage.validation_id, validated.validation_id);
});

test('rejects unknown projection kind', () => {
  assert.throws(
    () => createHfiRadarProjection({ kind: 'UNKNOWN' }),
    /RADAR_KIND_INVALID/
  );
});
