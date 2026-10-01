'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { detectPoolBootstrapFromDecodedEvents } = require('../src/core/hfi-formation-adapter');
const { createHistoricalOutcome } = require('../src/core/historical-outcome');
const { createLiquiditySurvivalCriterion } = require('../src/core/liquidity-survival');
const { createValidationBoundary } = require('../src/core/validation-boundary');
const { createResearchReport } = require('../src/core/research-report');
const { createXContentProjection } = require('../src/core/x-content-projection');
const {
  validateXContentPublicationReadiness,
} = require('../src/core/x-content-validation-readiness');

const FORMATION_END = '2026-01-01T00:02:00.000Z';
const WINDOW_END = '2026-01-08T00:02:00.000Z';

function decodedEvents() {
  return [
    {
      eventType: 'POOL_INITIALIZED',
      identity: 'ei:pool-created',
      chainId: 4663,
      poolId: '0xpool',
      blockNumber: 100,
      transactionIndex: 0,
      logIndex: 0,
      event_time: '2026-01-01T00:00:00.000Z',
    },
    {
      eventType: 'LIQUIDITY_MODIFIED',
      identity: 'ei:liquidity-added',
      chainId: 4663,
      poolId: '0xpool',
      blockNumber: 101,
      transactionIndex: 0,
      logIndex: 0,
      event_time: '2026-01-01T00:01:00.000Z',
      liquidityDelta: '1000',
    },
    {
      eventType: 'SWAP',
      identity: 'ei:first-swap',
      chainId: 4663,
      poolId: '0xpool',
      blockNumber: 102,
      transactionIndex: 0,
      logIndex: 0,
      event_time: FORMATION_END,
    },
  ];
}

function outcomeFor(formation) {
  return createHistoricalOutcome({
    formation_id: formation.formation_id,
    formation_rule_version: formation.formation_rule_version,
    formation_end: formation.formation_end,
    observation_start: FORMATION_END,
    observation_end: WINDOW_END,
    observations: Array.from({ length: 7 }, (_, day) => ({
      evidence_id: day === 0 ? 'ei:first-swap' : `ei:survival-${day}`,
      event_time: `2026-01-0${day + 1}T12:00:00.000Z`,
      value: { active_liquidity: '100', pool_id: '0xpool' },
    })),
    coverage_status: 'COMPLETE',
  });
}

test('HFI-MVP vertical projection preserves deterministic lineage through X content', () => {
  const formationResult = detectPoolBootstrapFromDecodedEvents(decodedEvents());
  assert.equal(formationResult.state, 'VALID');

  const formation = formationResult.formation;
  const outcome = outcomeFor(formation);

  const criterion = createLiquiditySurvivalCriterion({
    formation_id: formation.formation_id,
    pool_id: formation.pool_id,
    reference_evidence_id: 'ei:first-swap',
    reference_liquidity: '100',
    window_start: FORMATION_END,
    window_end: WINDOW_END,
    outcome,
  });

  assert.equal(criterion.status, 'PASS');

  const validation = createValidationBoundary({
    formation,
    outcome,
    criteria_results: [criterion],
    uncertainties: [],
  });

  assert.equal(validation.result, 'CONFIRMED');

  const reportInput = {
    formation,
    outcome,
    validation,
    claims: [{
      claim_id: 'claim:liquidity-survival',
      statement: 'Observed active liquidity remained at or above the configured threshold throughout the complete seven-day observation window.',
      evidence_ids: criterion.evidence_ids,
    }],
  };

  const report = createResearchReport(reportInput);

  const projection = createXContentProjection({
    formation,
    outcome,
    validation,
    claims: report.claims,
    provenance_reference: report.provenance_reference,
  });

  const readiness = validateXContentPublicationReadiness({
    research_report: reportInput,
    projection,
  });

  assert.equal(readiness.publication_ready, true);
  assert.equal(readiness.report_id, report.report_id);
  assert.deepEqual(readiness.content_item_ids, projection.content_items.map(item => item.content_item_id));
});
