"use strict";

const crypto = require("node:crypto");

const DOMAIN = "HAHAWEEK-EVIDENCE-V4-TRANSITION";
const STATES = new Set(["OBSERVED", "CANONICAL", "ORPHANED"]);
const EDGES = new Set(["OBSERVED->CANONICAL", "CANONICAL->ORPHANED"]);
const HASH_RE = /^[0-9a-f]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert(Number.isFinite(value), "NON_FINITE_NUMBER");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  assert(value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype, "NON_PLAIN_OBJECT");
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

function transitionHash(transition) {
  const bytes = Buffer.from(canonicalize(transition), "utf8");
  return crypto.createHash("sha256")
    .update(Buffer.concat([Buffer.from(DOMAIN, "utf8"), Buffer.from([0]), bytes]))
    .digest("hex");
}

function validateTransition(record) {
  assert(record && typeof record === "object", "INVALID_TRANSITION_RECORD");
  const t = record.transition;
  assert(t && typeof t === "object", "MISSING_TRANSITION");
  const keys = Object.keys(t).sort();
  assert(JSON.stringify(keys) === JSON.stringify([
    "evidence_id", "from_state", "previous_transition_hash", "sequence", "to_state"
  ]), "INVALID_TRANSITION_FIELDS");
  assert(typeof t.evidence_id === "string" && t.evidence_id.length > 0, "INVALID_EVIDENCE_ID");
  assert(STATES.has(t.from_state) && STATES.has(t.to_state), "INVALID_STATE");
  assert(EDGES.has(t.from_state + "->" + t.to_state), "INVALID_TRANSITION_EDGE");
  assert(typeof t.sequence === "string" && /^0|[1-9][0-9]*$/.test(t.sequence), "INVALID_SEQUENCE");
  if (t.previous_transition_hash !== null) {
    assert(typeof t.previous_transition_hash === "string" && HASH_RE.test(t.previous_transition_hash), "INVALID_PREVIOUS_HASH");
  }
  assert(typeof record.transition_hash === "string" && HASH_RE.test(record.transition_hash), "INVALID_TRANSITION_HASH");
  assert(record.transition_hash === transitionHash(t), "TRANSITION_DIGEST_MISMATCH");
  assert(record.provenance && typeof record.provenance === "object", "MISSING_PROVENANCE");
  assert(typeof record.provenance.evidence_id === "string", "MISSING_PROVENANCE_EVIDENCE_ID");
  assert(typeof record.provenance.block_id === "string" && record.provenance.block_id.length > 0, "MISSING_PROVENANCE_BLOCK_ID");
  assert(record.provenance.evidence_id === t.evidence_id, "PROVENANCE_EVIDENCE_MISMATCH");
}

function validateHistory(history, historyName) {
  assert(Array.isArray(history) && history.length > 0, "EMPTY_HISTORY:" + historyName);
  const byHash = new Map();
  const identities = new Map();
  let previous = null;

  for (const record of history) {
    validateTransition(record);
    const t = record.transition;
    const key = t.evidence_id + ":" + t.sequence;
    const prior = identities.get(key);
    if (prior && prior !== record.transition_hash) throw new Error("INTEGRITY_CONFLICT:" + historyName + ":" + key);
    identities.set(key, record.transition_hash);

    if (previous === null) {
      assert(t.previous_transition_hash === null, "GENESIS_PREDECESSOR_MISMATCH:" + historyName);
      assert(t.sequence === "0", "GENESIS_SEQUENCE_MISMATCH:" + historyName);
    } else {
      assert(t.previous_transition_hash === previous.transition_hash, "PREDECESSOR_MISMATCH:" + historyName);
      assert(BigInt(t.sequence) === BigInt(previous.transition.sequence) + 1n, "SEQUENCE_GAP:" + historyName);
    }
    byHash.set(record.transition_hash, record);
    previous = record;
  }
  return {
    history: historyName,
    first_sequence: history[0].transition.sequence,
    last_sequence: previous.transition.sequence,
    latest_transition_hash: previous.transition_hash,
    records: history.map(r => r.transition_hash),
  };
}

function indexRecords(histories) {
  const index = new Map();
  const identities = new Map();
  for (const history of histories) {
    for (const record of history) {
      const existing = index.get(record.transition_hash);
      if (existing && JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new Error("HASH_COLLISION");
      }
      const identity = record.transition.evidence_id + ":" + record.transition.sequence;
      const prior = identities.get(identity);
      if (prior && prior !== record.transition_hash) {
        throw new Error("INTEGRITY_CONFLICT:" + identity);
      }
      identities.set(identity, record.transition_hash);
      index.set(record.transition_hash, record);
    }
  }
  return index;
}

function validateScenario(input) {
  const original = JSON.stringify(input);
  assert(input && input.format === "HAHAWEEK-EVIDENCE-V4-F02-REORG-SCENARIO-1", "INVALID_FORMAT");
  assert(input.histories && typeof input.histories === "object" && !Array.isArray(input.histories) && Object.keys(input.histories).length >= 2, "INSUFFICIENT_HISTORIES");
  assert(typeof input.authoritative_history === "string", "MISSING_AUTHORITATIVE_HISTORY");
  assert(Array.isArray(input.recovery_prefix), "MISSING_RECOVERY_PREFIX");
  assert(input.provenance_contract === "EXPLICIT_EVIDENCE_AND_BLOCK", "INVALID_PROVENANCE_CONTRACT");

  const summaries = {};
  for (const [name, history] of Object.entries(input.histories)) {
    summaries[name] = validateHistory(history, name);
  }
  assert(summaries[input.authoritative_history], "UNKNOWN_AUTHORITATIVE_HISTORY");

  const index = indexRecords(Object.values(input.histories).flat());
  const authoritative = input.histories[input.authoritative_history];

  assert(input.recovery_prefix.length > 0, "EMPTY_RECOVERY_PREFIX");
  const authHashes = new Set(authoritative.map(r => r.transition_hash));
  for (const hash of input.recovery_prefix) assert(authHashes.has(hash), "RECOVERY_PREFIX_NOT_AUTHORITATIVE");
  const prefixPositions = input.recovery_prefix.map(hash => authoritative.findIndex(r => r.transition_hash === hash));
  assert(prefixPositions.every((v, i) => v === i), "RECOVERY_PREFIX_NOT_CONTIGUOUS");

  const replay = authoritative.slice(input.recovery_prefix.length);
  const clean = authoritative.map(r => r.transition_hash);
  const recovered = [...input.recovery_prefix, ...replay];
  assert(JSON.stringify(clean) === JSON.stringify(recovered), "REPLAY_DIVERGENCE");

  assert(Array.isArray(input.preserved_records), "MISSING_PRESERVED_RECORDS");
  const preserved = new Set(input.preserved_records);
  for (const hash of index.keys()) assert(preserved.has(hash), "HISTORICAL_RECORD_NOT_PRESERVED:" + hash);

  if (input.expected_authoritative_sequence !== undefined) {
    assert(input.expected_authoritative_sequence === summaries[input.authoritative_history].last_sequence, "AUTHORITATIVE_SEQUENCE_MISMATCH");
  }

  const result = {
    status: "VERIFIED",
    authoritative_history: input.authoritative_history,
    authoritative_contiguous_sequence: summaries[input.authoritative_history].last_sequence,
    latest_transition_hash: summaries[input.authoritative_history].latest_transition_hash,
    preserved_record_count: preserved.size,
    history_summaries: summaries,
    recovery: {
      prefix_length: input.recovery_prefix.length,
      replay_count: replay.length,
      deterministic: true,
    },
  };

  assert(JSON.stringify(input) === original, "FIXTURE_MUTATED");
  return result;
}

module.exports = { DOMAIN, canonicalize, transitionHash, validateTransition, validateScenario, clone };
