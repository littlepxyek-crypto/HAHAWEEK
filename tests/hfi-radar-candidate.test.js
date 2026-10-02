'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCandidateRadarRecord } = require('../src/core/hfi-radar-candidate');

function events() {
  return [
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
  ];
}

test('projects only the existing Formation Engine CANDIDATE state', () => {
  const result = createCandidateRadarRecord({ events: events() });

  assert.equal(result.radar_kind, 'CANDIDATE');
  assert.equal(result.radar_state, 'CANDIDATE');
  assert.equal(result.source_state, 'CANDIDATE');
  assert.deepEqual(result.evidence_ids, ['ei:created', 'ei:liquidity']);
  assert.equal(result.observation_boundary, '2026-09-10T09:04:40.000Z');
});

test('candidate identity is deterministic and independent of input ordering', () => {
  const first = createCandidateRadarRecord({ events: events() });
  const reversed = createCandidateRadarRecord({ events: [...events()].reverse() });

  assert.equal(first.radar_id, reversed.radar_id);
});

test('future FIRST_SWAP evidence prevents Candidate projection', () => {
  const withSwap = [
    ...events(),
    {
      event_type: 'SWAP',
      evidence_id: 'ei:swap',
      chain_id: 4663,
      pool_id: '0xpool',
      block_number: 101,
      transaction_index: 0,
      log_index: 0,
      event_time: '2026-09-10T09:05:00.000Z',
    },
  ];

  assert.throws(
    () => createCandidateRadarRecord({ events: withSwap }),
    /CANDIDATE_RADAR_REQUIRES_CANDIDATE_FORMATION_STATE/
  );
});

test('candidate record rejects duplicate selected evidence', () => {
  const duplicate = events();
  duplicate[1] = { ...duplicate[1], evidence_id: duplicate[0].evidence_id };

  assert.throws(
    () => createCandidateRadarRecord({ events: duplicate }),
    /EVIDENCE_IDS_DUPLICATE/
  );
});
