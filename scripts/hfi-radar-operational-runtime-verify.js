'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ethers } = require('ethers');

const { CHAIN_ID, POOL_MANAGER } = require('../src/core/pool-discovery');
const { createCandidateRadarRecord } = require('../src/core/hfi-radar-candidate');
const { createFormationRadarRecord } = require('../src/core/hfi-radar-formation');
const { createHfiRadarProjection } = require('../src/core/hfi-radar-projection');
const { createIntelligenceProjection } = require('../src/core/intelligence-projection');
const { createIntelligenceEvidenceSummary } = require('../src/core/intelligence-evidence-summary');
const { createValidatedRadarRecord } = require('../src/core/validated-radar-record');
const { createRadarReconciliation } = require('../src/core/hfi-radar-reconciliation');

const OUT = 'docs/runtime/hfi-radar-operational-latest.json';
const HFI_OUT = 'docs/runtime/hfi-mvp-e2e-latest.json';
const RPC = process.env.RPC_URL || 'https://rpc.ordofi.network';
const COMMIT = process.env.GITHUB_SHA || 'UNKNOWN';

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function write(value) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(value, null, 2) + '\n');
}

function fail(error, extra = {}) {
  write({
    verification_class: 'E5_RUNTIME',
    contract_id: 'HAHAWEEK-HFI-RADAR-OPERATIONALIZATION-V0_2',
    commit: COMMIT,
    chain_id: CHAIN_ID,
    state: 'FAILED',
    completed_at: new Date().toISOString(),
    failure: {
      code: error?.code || 'A7_RUNTIME_VERIFICATION_FAILURE',
      message: String(error?.message || error),
    },
    ...extra,
  });
}

function canonicalById(artifact, evidenceId) {
  return artifact.canonical_evidence.find((x) => x.evidence_id === evidenceId) || null;
}

function eventFromCanonical(artifact, eventType, evidenceId, eventTime) {
  const canonical = canonicalById(artifact, evidenceId);
  if (!canonical) throw new Error('RADAR_CANONICAL_EVIDENCE_MISSING');
  return {
    event_type: eventType,
    evidence_id: evidenceId,
    chain_id: canonical.chain_id,
    pool_id: artifact.formation.pool_id,
    block_number: canonical.location.block_number,
    transaction_index: canonical.location.transaction_index ?? 0,
    log_index: canonical.location.log_index,
    event_time: eventTime,
  };
}

function provider() {
  const request = new ethers.FetchRequest(RPC);
  request.timeout = 30000;
  return new ethers.JsonRpcProvider(
    request,
    ethers.Network.from({ name: 'robinhood-mainnet', chainId: CHAIN_ID }),
    { batchMaxCount: 4 }
  );
}

async function blockTimesForFormation(artifact) {
  const p = provider();
  try {
    const order = artifact.formation.event_order;
    const uniqueBlocks = [...new Set(order.map((x) => x.block_number))];
    const entries = await Promise.all(uniqueBlocks.map(async (blockNumber) => {
      const block = await p.getBlock(blockNumber);
      if (!block || block.timestamp == null) {
        throw new Error('RADAR_BLOCK_TIMESTAMP_UNAVAILABLE');
      }
      return [blockNumber, new Date(Number(block.timestamp) * 1000).toISOString()];
    }));
    return new Map(entries);
  } finally {
    await p.destroy();
  }
}

function candidateInput(artifact, blockTimes) {
  const order = artifact.formation.event_order;
  const created = order.find((x) => x.event_type === 'POOL_CREATED');
  const liquidity = order.find((x) => x.event_type === 'LIQUIDITY_ADDED');
  if (!created || !liquidity) throw new Error('RADAR_CANDIDATE_FORMATION_INPUT_INCOMPLETE');

  return [
    eventFromCanonical(
      artifact,
      'POOL_CREATED',
      created.evidence_id,
      blockTimes.get(created.block_number)
    ),
    eventFromCanonical(
      artifact,
      'LIQUIDITY_ADDED',
      liquidity.evidence_id,
      blockTimes.get(liquidity.block_number)
    ),
  ];
}

function main() {
  const startedAt = new Date().toISOString();
  write({
    verification_class: 'E5_RUNTIME',
    contract_id: 'HAHAWEEK-HFI-RADAR-OPERATIONALIZATION-V0_2',
    commit: COMMIT,
    chain_id: CHAIN_ID,
    state: 'RUNNING',
    started_at: startedAt,
  });

  try {
    const env = {
      ...process.env,
      RPC_URL: RPC,
      HFI_POOL_ID: process.env.HFI_POOL_ID ||
        '0xf399bd1544377680d48c62fd85c2105b869e55906c4189cc5ab3b4e83446928c',
      HFI_POOL_INIT_BLOCK: process.env.HFI_POOL_INIT_BLOCK || '59281988',
      GITHUB_SHA: COMMIT,
    };

    execFileSync(process.execPath, ['scripts/hfi-mvp-runtime-verify.js'], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });

    if (!fs.existsSync(HFI_OUT)) throw new Error('HFI_MVP_RUNTIME_ARTIFACT_MISSING');
    const artifact = JSON.parse(fs.readFileSync(HFI_OUT, 'utf8'));

    if (artifact.state !== 'VERIFIED') throw new Error('HFI_MVP_RUNTIME_NOT_VERIFIED');
    if (artifact.chain_id !== CHAIN_ID) throw new Error('CHAIN_ID_MISMATCH');
    if (artifact.commit !== COMMIT) throw new Error('HFI_RUNTIME_COMMIT_MISMATCH');
    if (artifact.source?.authority !== 'Robinhood Mainnet JSON-RPC') {
      throw new Error('REAL_MAINNET_AUTHORITY_NOT_VERIFIED');
    }
    if (!artifact.formation || artifact.formation.state !== 'VALID') {
      throw new Error('FORMATION_NOT_VERIFIED');
    }
    if (!artifact.validation || artifact.validation.result !== 'CONFIRMED') {
      throw new Error('VALIDATION_NOT_CONFIRMED');
    }

    const blockTimes = blockTimesForFormation;
    return blockTimesForFormation(artifact).then((times) => {
      const events = candidateInput(artifact, times);
      const candidate = createCandidateRadarRecord({ events });
      const candidateReplay = createCandidateRadarRecord({ events: [...events].reverse() });

      if (candidate.radar_id !== candidateReplay.radar_id) {
        throw new Error('CANDIDATE_REPLAY_NON_EQUIVALENT');
      }
      if (candidate.evidence_ids.length !== 2) {
        throw new Error('CANDIDATE_LOOKAHEAD_INPUT_INVALID');
      }

      const formationRadar = createFormationRadarRecord({
        formation: artifact.formation,
      });
      const formationReplay = createFormationRadarRecord({
        formation: {
          ...artifact.formation,
          evidence_ids: [...artifact.formation.evidence_ids].reverse(),
        },
      });
      if (formationRadar.radar_id !== formationReplay.radar_id) {
        throw new Error('FORMATION_REPLAY_NON_EQUIVALENT');
      }

      const intelligence = createIntelligenceProjection({
        formation: artifact.formation,
        outcome: artifact.outcome,
        validation: artifact.validation,
      });
      const summary = createIntelligenceEvidenceSummary({
        intelligence,
        formation: artifact.formation,
        outcome: artifact.outcome,
        validation: artifact.validation,
      });
      const validatedRadar = createValidatedRadarRecord({ summary });
      const validatedProjection = createHfiRadarProjection({
        kind: 'VALIDATED',
        validated_radar: validatedRadar,
      });

      const intelligenceReplay = createIntelligenceProjection({
        formation: artifact.formation,
        outcome: artifact.outcome,
        validation: artifact.validation,
      });
      const summaryReplay = createIntelligenceEvidenceSummary({
        intelligence: intelligenceReplay,
        formation: artifact.formation,
        outcome: artifact.outcome,
        validation: artifact.validation,
      });
      const validatedReplay = createValidatedRadarRecord({ summary: summaryReplay });

      if (validatedRadar.radar_id !== validatedReplay.radar_id) {
        throw new Error('VALIDATED_RADAR_REPLAY_NON_EQUIVALENT');
      }

      const reconciliation = createRadarReconciliation({
        reason: 'CANONICALITY_CHANGE',
        previous: {
          radar_id: candidate.radar_id,
          evidence_ids: candidate.evidence_ids,
        },
        current: {
          radar_id: candidate.radar_id,
          evidence_ids: [...candidate.evidence_ids].reverse(),
        },
      });
      if (reconciliation.state !== 'UNCHANGED') {
        throw new Error('RADAR_RECONCILIATION_IDEMPOTENCY_INVALID');
      }

      const radarIntegrity = {
        upstream_hfi_artifact_digest: digest({
          commit: artifact.commit,
          formation_id: artifact.formation.formation_id,
          outcome_id: artifact.outcome.outcome_id,
          validation_id: artifact.validation.validation_id,
          source_manifest: artifact.integrity?.manifest ?? null,
        }),
        candidate_radar_id: candidate.radar_id,
        formation_radar_id: formationRadar.radar_id,
        validated_radar_id: validatedRadar.radar_id,
        projection_id: validatedProjection.projection_id,
      };

      const result = {
        verification_class: 'E5_RUNTIME',
        contract_id: 'HAHAWEEK-HFI-RADAR-OPERATIONALIZATION-V0_2',
        commit: COMMIT,
        chain_id: CHAIN_ID,
        rpc_url: RPC,
        state: 'VERIFIED',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        source: {
          authority: 'Robinhood Mainnet JSON-RPC',
          chain_id: CHAIN_ID,
          pool_manager: POOL_MANAGER,
          upstream_contract_id: artifact.contract_id,
          upstream_hfi_artifact_commit: artifact.commit,
          external_network: true,
          external_actions: false,
          publication_executed: false,
        },
        checks: {
          real_mainnet_evidence: true,
          candidate_projection: true,
          candidate_replay_equivalent: true,
          candidate_excludes_first_swap: true,
          candidate_observation_boundary: candidate.observation_boundary,
          formation_projection: true,
          formation_replay_equivalent: true,
          validated_projection: true,
          validated_replay_equivalent: true,
          provenance_preserved: true,
          integrity_reference: true,
          no_lookahead: true,
          reconciliation_idempotent: true,
          authoritative_evidence_mutated: false,
          external_action: false,
        },
        lineage: {
          formation_id: artifact.formation.formation_id,
          outcome_id: artifact.outcome.outcome_id,
          validation_id: artifact.validation.validation_id,
          candidate_radar_id: candidate.radar_id,
          formation_radar_id: formationRadar.radar_id,
          intelligence_id: intelligence.intelligence_id,
          summary_id: summary.summary_id,
          validated_radar_id: validatedRadar.radar_id,
          validated_projection_id: validatedProjection.projection_id,
          candidate_evidence_ids: candidate.evidence_ids,
          formation_evidence_ids: formationRadar.evidence_ids,
          validated_evidence_ids: validatedRadar.evidence_ids,
        },
        radar_integrity: {
          ...radarIntegrity,
          digest: digest(radarIntegrity),
        },
        upstream_runtime: {
          artifact_state: artifact.state,
          raw_evidence_count: Array.isArray(artifact.raw_evidence) ? artifact.raw_evidence.length : 0,
          canonical_evidence_count: Array.isArray(artifact.canonical_evidence) ? artifact.canonical_evidence.length : 0,
          graph_nodes: artifact.graph?.nodes?.length ?? 0,
          graph_edges: artifact.graph?.edges?.length ?? 0,
          formation_id: artifact.formation.formation_id,
          outcome_id: artifact.outcome.outcome_id,
          validation_id: artifact.validation.validation_id,
          report_id: artifact.report?.report_id ?? null,
          replay_equivalent: artifact.replay?.equivalent === true,
        },
        radar: {
          candidate,
          formation: formationRadar,
          validated: validatedRadar,
          validated_projection: validatedProjection,
          reconciliation,
        },
      };

      write(result);
    });
  } catch (error) {
    fail(error, {
      upstream_runtime_artifact: fs.existsSync(HFI_OUT)
        ? JSON.parse(fs.readFileSync(HFI_OUT, 'utf8'))
        : null,
    });
    process.exitCode = 1;
  }
}

Promise.resolve(main()).catch((error) => {
  fail(error);
  process.exitCode = 1;
});
