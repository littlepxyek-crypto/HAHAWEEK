'use strict';

const crypto = require('node:crypto');

const SCHEMA_VERSION = '1';
const RULE_VERSION = 'behavioral-intelligence-v0.1';
const ALGORITHM_VERSION = 'behavioral-algorithms-v0.1';

const STATUSES = new Set(['OBSERVED', 'DERIVED', 'INFERRED', 'UNKNOWN', 'INCONCLUSIVE']);
const CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']);

function fail(code) {
  throw new TypeError(code);
}

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field + '_REQUIRED');
}

function string(value, field) {
  if (typeof value !== 'string' || value.length === 0) fail(field + '_REQUIRED');
}

function uniqueStrings(values, field, allowEmpty = false) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) fail(field + '_REQUIRED');
  const seen = new Set();
  for (const value of values) {
    string(value, field + '_ENTRY');
    if (seen.has(value)) fail(field + '_DUPLICATE');
    seen.add(value);
  }
  return [...seen];
}

function integer(value, field, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) fail(field + '_INVALID');
}

function finite(value, field, min = null) {
  if (!Number.isFinite(value) || (min !== null && value < min)) fail(field + '_INVALID');
}

function timestamp(value, field) {
  string(value, field);
  if (!Number.isFinite(Date.parse(value))) fail(field + '_INVALID');
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) out[key] = canonicalize(value[key]);
  }
  return out;
}

function digest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function evidenceSet(admission) {
  object(admission, 'admission');
  return new Set(uniqueStrings(admission.evidence_refs, 'admission.evidence_refs'));
}

function assertEvidenceRefs(refs, allowed) {
  for (const ref of refs) {
    if (!allowed.has(ref)) fail('EVIDENCE_REF_UNRESOLVED');
  }
}

function assertCutoff(observedAt, cutoff) {
  if (cutoff === null || cutoff === undefined) return;
  timestamp(cutoff, 'as_of');
  if (Date.parse(observedAt) > Date.parse(cutoff)) fail('FUTURE_OBSERVATION_RELATIVE_TO_AS_OF');
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function pairwiseOverlap(sets) {
  if (sets.length < 2) return null;
  let total = 0;
  let count = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const a = new Set(sets[i]);
      const b = new Set(sets[j]);
      const union = new Set([...a, ...b]);
      const intersection = [...a].filter(x => b.has(x)).length;
      total += union.size ? intersection / union.size : 0;
      count += 1;
    }
  }
  return count ? total / count : null;
}

function createFinding(input) {
  object(input, 'input');
  string(input.finding_type, 'finding_type');
  object(input.subject, 'subject');
  string(input.subject.type, 'subject.type');
  string(input.subject.id, 'subject.id');
  if (!STATUSES.has(input.status)) fail('STATUS_INVALID');
  const evidenceRefs = uniqueStrings(input.evidence_refs, 'evidence_refs');
  const allowed = evidenceSet(input.admission);
  assertEvidenceRefs(evidenceRefs, allowed);
  object(input.temporal_scope, 'temporal_scope');
  if (input.temporal_scope.as_of !== null) timestamp(input.temporal_scope.as_of, 'temporal_scope.as_of');
  if (input.temporal_scope.observed_from !== null) timestamp(input.temporal_scope.observed_from, 'temporal_scope.observed_from');
  if (input.temporal_scope.observed_to !== null) timestamp(input.temporal_scope.observed_to, 'temporal_scope.observed_to');
  string(input.rule_version, 'rule_version');
  string(input.algorithm_version, 'algorithm_version');
  if (!CONFIDENCE.has(input.confidence)) fail('CONFIDENCE_INVALID');
  if (!Array.isArray(input.uncertainty)) fail('UNCERTAINTY_REQUIRED');
  input.uncertainty.forEach((v, i) => string(v, 'uncertainty_' + i));
  string(input.methodology, 'methodology');

  const canonical = {
    schema_version: SCHEMA_VERSION,
    finding_type: input.finding_type,
    subject: { type: input.subject.type, id: input.subject.id },
    status: input.status,
    evidence_refs: evidenceRefs,
    temporal_scope: structuredClone(input.temporal_scope),
    rule_version: input.rule_version,
    algorithm_version: input.algorithm_version,
    confidence: input.confidence,
    uncertainty: [...input.uncertainty],
    methodology: input.methodology,
  };

  return {
    ...canonical,
    finding_id: 'behavioral-finding:v1:' + digest(canonical),
  };
}

function normalizeLaunch(launch, asOf, allowed) {
  object(launch, 'launch');
  string(launch.launch_id, 'launch.launch_id');
  string(launch.deployer_id, 'launch.deployer_id');
  timestamp(launch.observed_at, 'launch.observed_at');
  assertCutoff(launch.observed_at, asOf);
  const evidenceRefs = uniqueStrings(launch.evidence_refs, 'launch.evidence_refs');
  assertEvidenceRefs(evidenceRefs, allowed);
  const funding = launch.funding_source_ids === undefined ? [] : uniqueStrings(launch.funding_source_ids, 'launch.funding_source_ids', true);
  const exitPattern = launch.exit_pattern === undefined ? 'UNKNOWN' : String(launch.exit_pattern);
  const clusterSize = launch.cluster_wallet_count === undefined ? null : launch.cluster_wallet_count;
  if (clusterSize !== null) integer(clusterSize, 'launch.cluster_wallet_count');
  const hold = launch.hold_duration_seconds === undefined ? null : launch.hold_duration_seconds;
  if (hold !== null) finite(hold, 'launch.hold_duration_seconds', 0);
  return {
    launch_id: launch.launch_id,
    deployer_id: launch.deployer_id,
    observed_at: launch.observed_at,
    evidence_refs: evidenceRefs,
    funding_source_ids: funding,
    exit_pattern: exitPattern,
    cluster_wallet_count: clusterSize,
    hold_duration_seconds: hold,
  };
}

function analyzeDeployerFingerprint(input) {
  object(input, 'input');
  object(input.admission, 'admission');
  string(input.deployer_id, 'deployer_id');
  if (!Array.isArray(input.launches) || input.launches.length === 0) fail('launches_REQUIRED');
  const allowed = evidenceSet(input.admission);
  const asOf = input.as_of ?? null;
  const launches = input.launches
    .map(x => normalizeLaunch(x, asOf, allowed))
    .filter(x => x.deployer_id === input.deployer_id)
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at) || a.launch_id.localeCompare(b.launch_id));
  if (!launches.length) fail('DEPLOYER_LAUNCHES_EMPTY');

  const intervals = [];
  for (let i = 1; i < launches.length; i += 1) {
    intervals.push((Date.parse(launches[i].observed_at) - Date.parse(launches[i - 1].observed_at)) / 1000);
  }

  const holds = launches.filter(x => x.hold_duration_seconds !== null).map(x => x.hold_duration_seconds);
  const clusters = launches.filter(x => x.cluster_wallet_count !== null).map(x => x.cluster_wallet_count);
  const fundingSets = launches.map(x => x.funding_source_ids).filter(x => x.length > 0);
  const exitDistribution = {};
  for (const launch of launches) exitDistribution[launch.exit_pattern] = (exitDistribution[launch.exit_pattern] || 0) + 1;

  const evidenceRefs = [...new Set(launches.flatMap(x => x.evidence_refs))].sort();
  const fingerprint = {
    schema_version: SCHEMA_VERSION,
    rule_version: RULE_VERSION,
    algorithm_version: ALGORITHM_VERSION,
    deployer_id: input.deployer_id,
    launch_count: launches.length,
    median_launch_interval_seconds: median(intervals),
    average_hold_duration_seconds: holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : null,
    exit_pattern_distribution: exitDistribution,
    average_cluster_wallet_count: clusters.length ? clusters.reduce((a, b) => a + b, 0) / clusters.length : null,
    funding_source_pairwise_jaccard: pairwiseOverlap(fundingSets),
    evidence_refs: evidenceRefs,
    as_of: asOf,
  };

  return {
    fingerprint,
    fingerprint_id: 'deployer-fingerprint:v1:' + digest(fingerprint),
    finding: createFinding({
      finding_type: 'DEPLOYER_BEHAVIORAL_FINGERPRINT',
      subject: { type: 'DEPLOYER', id: input.deployer_id },
      status: 'DERIVED',
      evidence_refs: evidenceRefs,
      temporal_scope: {
        as_of: asOf,
        observed_from: launches[0].observed_at,
        observed_to: launches[launches.length - 1].observed_at,
      },
      rule_version: RULE_VERSION,
      algorithm_version: ALGORITHM_VERSION,
      confidence: launches.length >= 3 ? 'MEDIUM' : 'LOW',
      uncertainty: [
        'Behavioral similarity does not establish common ownership.',
        'Missing launch history may reduce completeness.',
        'No malicious-intent conclusion is produced.',
      ],
      methodology: 'Deterministic descriptive fingerprint over admitted deployer launch observations.',
      admission: input.admission,
    }),
  };
}

function buildWalletClusters(input) {
  object(input, 'input');
  object(input.admission, 'admission');
  if (!Array.isArray(input.wallet_ids) || input.wallet_ids.length === 0) fail('wallet_ids_REQUIRED');
  if (!Array.isArray(input.relationships)) fail('relationships_REQUIRED');
  const allowed = evidenceSet(input.admission);
  const wallets = [...new Set(input.wallet_ids.map((v, i) => {
    string(v, 'wallet_id_' + i);
    return v;
  }))].sort();
  const parent = new Map(wallets.map(w => [w, w]));
  const rank = new Map(wallets.map(w => [w, 0]));

  function find(x) {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(x) !== x) {
      const next = parent.get(x);
      parent.set(x, root);
      x = next;
    }
    return root;
  }
  function union(a, b) {
    if (!parent.has(a) || !parent.has(b)) fail('RELATIONSHIP_WALLET_UNRESOLVED');
    let ra = find(a); let rb = find(b);
    if (ra === rb) return;
    if (rank.get(ra) < rank.get(rb)) [ra, rb] = [rb, ra];
    parent.set(rb, ra);
    if (rank.get(ra) === rank.get(rb)) rank.set(ra, rank.get(ra) + 1);
  }

  const edges = input.relationships.map((r, i) => {
    object(r, 'relationship_' + i);
    string(r.from, 'relationship.from');
    string(r.to, 'relationship.to');
    string(r.type, 'relationship.type');
    const evidenceRefs = uniqueStrings(r.evidence_refs, 'relationship.evidence_refs');
    assertEvidenceRefs(evidenceRefs, allowed);
    if (!['SHARED_FUNDER', 'SYNCHRONIZED_ENTRY', 'COMMON_EXIT'].includes(r.type)) fail('RELATIONSHIP_TYPE_INVALID');
    union(r.from, r.to);
    return { from: r.from, to: r.to, type: r.type, evidence_refs: evidenceRefs.sort() };
  });

  const grouped = new Map();
  for (const wallet of wallets) {
    const root = find(wallet);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(wallet);
  }

  const clusters = [...grouped.values()]
    .map(members => members.sort())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((members, index) => {
      const memberSet = new Set(members);
      const clusterEdges = edges.filter(e => memberSet.has(e.from) && memberSet.has(e.to));
      const evidenceRefs = [...new Set(clusterEdges.flatMap(e => e.evidence_refs))].sort();
      return {
        cluster_id: 'wallet-cluster:v1:' + digest({ members, edges: clusterEdges }),
        ordinal: index,
        members,
        size: members.length,
        edge_types: [...new Set(clusterEdges.map(e => e.type))].sort(),
        evidence_refs: evidenceRefs,
      };
    });

  return {
    schema_version: SCHEMA_VERSION,
    rule_version: RULE_VERSION,
    algorithm_version: ALGORITHM_VERSION,
    clusters,
    relationship_count: edges.length,
    methodology: 'Deterministic connected-component projection over admitted wallet relationships.',
    limitations: [
      'Connected components are descriptive and do not prove common ownership.',
      'Synchronized timing is not independently sufficient to establish identity.',
      'Incomplete acquisition is not interpreted as absence.',
    ],
  };
}

function analyzeFundFlow(input) {
  object(input, 'input');
  object(input.admission, 'admission');
  if (!Array.isArray(input.transfers) || input.transfers.length === 0) fail('transfers_REQUIRED');
  const allowed = evidenceSet(input.admission);
  const asOf = input.as_of ?? null;
  const edges = input.transfers.map((t, i) => {
    object(t, 'transfer_' + i);
    string(t.from, 'transfer.from');
    string(t.to, 'transfer.to');
    timestamp(t.event_time, 'transfer.event_time');
    assertCutoff(t.event_time, asOf);
    const evidenceRefs = uniqueStrings(t.evidence_refs, 'transfer.evidence_refs');
    assertEvidenceRefs(evidenceRefs, allowed);
    if (t.amount !== undefined) finite(t.amount, 'transfer.amount', 0);
    return {
      from: t.from,
      to: t.to,
      asset: t.asset === undefined ? null : String(t.asset),
      amount: t.amount === undefined ? null : t.amount,
      event_time: t.event_time,
      evidence_refs: evidenceRefs.sort(),
    };
  }).sort((a, b) =>
    Date.parse(a.event_time) - Date.parse(b.event_time) ||
    a.from.localeCompare(b.from) ||
    a.to.localeCompare(b.to) ||
    JSON.stringify(a.evidence_refs).localeCompare(JSON.stringify(b.evidence_refs))
  );

  const nodes = [...new Set(edges.flatMap(e => [e.from, e.to]))].sort();
  const evidenceRefs = [...new Set(edges.flatMap(e => e.evidence_refs))].sort();
  const adjacency = {};
  for (const node of nodes) adjacency[node] = [];
  for (const edge of edges) adjacency[edge.from].push({
    to: edge.to,
    asset: edge.asset,
    amount: edge.amount,
    event_time: edge.event_time,
    evidence_refs: edge.evidence_refs,
  });
  for (const node of nodes) adjacency[node].sort((a, b) =>
    Date.parse(a.event_time) - Date.parse(b.event_time) ||
    a.to.localeCompare(b.to)
  );

  return {
    schema_version: SCHEMA_VERSION,
    rule_version: RULE_VERSION,
    algorithm_version: ALGORITHM_VERSION,
    nodes,
    edges,
    adjacency,
    evidence_refs: evidenceRefs,
    as_of: asOf,
    methodology: 'Deterministic directed fund-flow projection over admitted transfer observations.',
    limitations: [
      'Flow connectivity does not establish ownership.',
      'Observed transfers are not equivalent to complete economic flow.',
      'Missing acquisition coverage remains unknown.',
    ],
  };
}

function findTemporalCoordination(input) {
  object(input, 'input');
  object(input.admission, 'admission');
  if (!Array.isArray(input.events) || input.events.length < 2) fail('events_REQUIRED');
  const allowed = evidenceSet(input.admission);
  const windowSeconds = input.window_seconds === undefined ? 300 : input.window_seconds;
  integer(windowSeconds, 'window_seconds');
  const asOf = input.as_of ?? null;
  const events = input.events.map((event, i) => {
    object(event, 'event_' + i);
    string(event.entity_id, 'event.entity_id');
    timestamp(event.event_time, 'event.event_time');
    assertCutoff(event.event_time, asOf);
    const evidenceRefs = uniqueStrings(event.evidence_refs, 'event.evidence_refs');
    assertEvidenceRefs(evidenceRefs, allowed);
    return { entity_id: event.entity_id, event_time: event.event_time, evidence_refs: evidenceRefs };
  }).sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time) || a.entity_id.localeCompare(b.entity_id));

  const groups = [];
  let current = [];
  for (const event of events) {
    if (!current.length || (Date.parse(event.event_time) - Date.parse(current[current.length - 1].event_time)) / 1000 <= windowSeconds) {
      current.push(event);
    } else {
      if (current.length > 1) groups.push(current);
      current = [event];
    }
  }
  if (current.length > 1) groups.push(current);

  return groups.map((group, index) => {
    const evidenceRefs = [...new Set(group.flatMap(e => e.evidence_refs))].sort();
    return createFinding({
      finding_type: 'TEMPORAL_COORDINATION_OBSERVATION',
      subject: { type: 'EVENT_GROUP', id: String(index) },
      status: 'OBSERVED',
      evidence_refs: evidenceRefs,
      temporal_scope: {
        as_of: asOf,
        observed_from: group[0].event_time,
        observed_to: group[group.length - 1].event_time,
      },
      rule_version: RULE_VERSION,
      algorithm_version: ALGORITHM_VERSION,
      confidence: 'LOW',
      uncertainty: [
        'Temporal proximity alone does not establish coordination.',
        'Clock/event ordering depends on source observation quality.',
      ],
      methodology: 'Deterministic grouping of admitted observations within an explicit temporal window.',
      admission: input.admission,
    });
  });
}

module.exports = {
  SCHEMA_VERSION,
  RULE_VERSION,
  ALGORITHM_VERSION,
  STATUSES,
  CONFIDENCE,
  canonicalize,
  createFinding,
  analyzeDeployerFingerprint,
  buildWalletClusters,
  analyzeFundFlow,
  findTemporalCoordination,
};
