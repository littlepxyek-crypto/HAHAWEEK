'use strict';

const LIQUIDITY_SURVIVAL_RULE_VERSION = 'liquidity-survival-v1';
const DEFAULT_WINDOW_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_MINIMUM_FRACTION_BPS = 5000;
const BPS_DENOMINATOR = 10000n;

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function integerString(value, name) {
  requireString(value, name);
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name.toUpperCase()}_INVALID`);
  }
}

function timestamp(value, name) {
  requireString(value, name);
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${name.toUpperCase()}_INVALID`);
  }
}

function createLiquiditySurvivalCriterion(input) {
  requireObject(input, 'input');
  requireObject(input.outcome, 'outcome');

  requireString(input.formation_id, 'formation_id');
  requireString(input.pool_id, 'pool_id');
  requireString(input.reference_evidence_id, 'reference_evidence_id');
  integerString(input.reference_liquidity, 'reference_liquidity');

  const reference = BigInt(input.reference_liquidity);
  if (reference <= 0n) throw new Error('REFERENCE_LIQUIDITY_MUST_BE_POSITIVE');

  const ruleVersion = input.rule_version ?? LIQUIDITY_SURVIVAL_RULE_VERSION;
  requireString(ruleVersion, 'rule_version');

  const windowSeconds = input.window_seconds ?? DEFAULT_WINDOW_SECONDS;
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds <= 0) {
    throw new Error('INVALID_WINDOW_SECONDS');
  }

  const minimumFractionBps = input.minimum_fraction_bps ?? DEFAULT_MINIMUM_FRACTION_BPS;
  if (!Number.isSafeInteger(minimumFractionBps) || minimumFractionBps <= 0 || minimumFractionBps > 10000) {
    throw new Error('INVALID_MINIMUM_FRACTION_BPS');
  }

  timestamp(input.window_start, 'window_start');
  timestamp(input.window_end, 'window_end');

  const start = Date.parse(input.window_start);
  const end = Date.parse(input.window_end);
  if (end - start !== windowSeconds * 1000) {
    throw new Error('WINDOW_DURATION_MISMATCH');
  }

  if (input.outcome.observation_start !== input.window_start ||
      input.outcome.observation_end !== input.window_end) {
    throw new Error('OUTCOME_WINDOW_MISMATCH');
  }

  if (!['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(input.outcome.coverage_status)) {
    throw new Error('INVALID_OUTCOME_COVERAGE');
  }

  if (!Array.isArray(input.outcome.observations)) {
    throw new Error('OUTCOME_OBSERVATIONS_REQUIRED');
  }

  const observations = input.outcome.observations.map((observation) => {
    requireObject(observation, 'observation');
    requireString(observation.evidence_id, 'evidence_id');
    timestamp(observation.event_time, 'event_time');
    requireObject(observation.value, 'value');
    integerString(observation.value.active_liquidity, 'active_liquidity');
    requireString(observation.value.pool_id, 'pool_id');
    if (observation.value.pool_id.toLowerCase() !== input.pool_id.toLowerCase()) {
      throw new Error('OBSERVATION_POOL_MISMATCH');
    }

    if (observation.event_time < input.window_start || observation.event_time > input.window_end) {
      throw new Error('OBSERVATION_OUTSIDE_WINDOW');
    }

    return {
      evidence_id: observation.evidence_id,
      event_time: observation.event_time,
      active_liquidity: observation.value.active_liquidity,
    };
  });

  const threshold = reference * BigInt(minimumFractionBps);
  const bucketDuration = windowSeconds * 1000;
  const bucketEvidence = Array.from({ length: Math.ceil(windowSeconds / (24 * 60 * 60)) }, () => []);

  for (const observation of observations) {
    const offset = Date.parse(observation.event_time) - start;
    const bucket = Math.min(
      bucketEvidence.length - 1,
      Math.floor(offset / (24 * 60 * 60 * 1000))
    );
    bucketEvidence[bucket].push(observation.evidence_id);
  }

  const missingBuckets = bucketEvidence
    .map((ids, index) => ids.length === 0 ? index : null)
    .filter(index => index !== null);

  const evidenceIds = [
    input.reference_evidence_id,
    ...observations.map((observation) => observation.evidence_id),
  ];

  let status = 'PASS';
  if (input.outcome.coverage_status !== 'COMPLETE' || missingBuckets.length > 0) {
    status = 'INCONCLUSIVE';
  } else {
    for (const observation of observations) {
      if (BigInt(observation.active_liquidity) * BPS_DENOMINATOR < threshold) {
        status = 'FAIL';
        break;
      }
    }
  }

  return {
    criterion_id: ruleVersion,
    status,
    evidence_ids: [...new Set(evidenceIds)],
    detail: {
      rule_version: ruleVersion,
      formation_id: input.formation_id,
      window_start: input.window_start,
      window_end: input.window_end,
      window_seconds: windowSeconds,
      pool_id: input.pool_id.toLowerCase(),
      reference_evidence_id: input.reference_evidence_id,
      reference_liquidity: input.reference_liquidity,
      minimum_fraction_bps: minimumFractionBps,
      missing_buckets: missingBuckets,
      observation_count: observations.length,
      threshold_comparison: 'active_liquidity * 10000 >= reference_liquidity * minimum_fraction_bps',
    },
  };
}

module.exports = {
  LIQUIDITY_SURVIVAL_RULE_VERSION,
  DEFAULT_WINDOW_SECONDS,
  DEFAULT_MINIMUM_FRACTION_BPS,
  createLiquiditySurvivalCriterion,
};
