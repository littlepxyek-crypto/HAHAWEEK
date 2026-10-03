'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { detectPoolBootstrapFromDecodedEvents } = require('../src/core/hfi-formation-adapter');
const { createHistoricalOutcome } = require('../src/core/historical-outcome');
const { createLiquiditySurvivalCriterion } = require('../src/core/liquidity-survival');
const { createValidationBoundary } = require('../src/core/validation-boundary');
const { createHypothesis, linkValidationToHypothesis } = require('../src/core/formation-hypothesis-validation');
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

function temporalContext(formation, outcome) {
  const byId = new Map(
    formation.evidence_ids.map((evidence_id) => [
      evidence_id,
      {
        evidence_id,
        event_time: decodedEvents().find((event) => event.identity === evidence_id).event_time,
        roles: ['FORMATION'],
      },
    ])
  );
  for (const observation of outcome.observations) {
    const existing = byId.get(observation.evidence_id);
    if (existing) {
      existing.roles = [...new Set([...existing.roles, 'OUTCOME'])];
    } else {
      byId.set(observation.evidence_id, {
        evidence_id: observation.evidence_id,
        event_time: observation.event_time,
        roles: ['OUTCOME'],
      });
    }
  }
  return [...byId.values()];
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
    formation_cutoff: FORMATION_END,
    evidence_temporal_context: temporalContext(formation, outcome),
    criteria_results: [criterion],
    uncertainties: [],
  });

  assert.equal(validation.result, 'CONFIRMED');

  const replayFormation = detectPoolBootstrapFromDecodedEvents(decodedEvents()).formation;
  const replayOutcome = outcomeFor(replayFormation);
  const replayCriterion = createLiquiditySurvivalCriterion({
    formation_id: replayFormation.formation_id,
    pool_id: replayFormation.pool_id,
    reference_evidence_id: 'ei:first-swap',
    reference_liquidity: '100',
    window_start: FORMATION_END,
    window_end: WINDOW_END,
    outcome: replayOutcome,
  });
  const replayValidation = createValidationBoundary({
    formation: replayFormation,
    outcome: replayOutcome,
    formation_cutoff: FORMATION_END,
    evidence_temporal_context: temporalContext(replayFormation, replayOutcome),
    criteria_results: [replayCriterion],
    uncertainties: [],
  });
  assert.equal(validation.validation_id, replayValidation.validation_id);
  assert.deepEqual(validation.evidence_temporal_context, replayValidation.evidence_temporal_context);

  const hypothesis = createHypothesis({
    formation_id: formation.formation_id,
    formation_state: formation.state,
    statement: 'Observed active liquidity survives the configured seven-day validation window.',
    evidence_ids: [...new Set([...formation.evidence_ids, ...criterion.evidence_ids])],
    temporal_context: { formation_cutoff: formation.formation_end, validation_window_end: outcome.observation_end },
    processing_context_id: 'test:hfi-mvp',
    provenance: { formation_id: formation.formation_id, validation_rule_version: validation.validation_rule_version },
  });
  const hypothesisValidation = linkValidationToHypothesis({ hypothesis, validation });
  assert.equal(hypothesis.authority, 'DERIVED');
  assert.equal(hypothesisValidation.authority, 'DERIVED');
  assert.equal(hypothesisValidation.hypothesis_id, hypothesis.hypothesis_id);
  assert.equal(hypothesisValidation.validation_id, validation.validation_id);

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
