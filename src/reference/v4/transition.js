"use strict";

const { canonicalize } = require("./jcs");
const { domainSeparatedHash } = require("./hash");

const REQUIRED_KEYS = [
  "evidence_id",
  "from_state",
  "previous_transition_hash",
  "sequence",
  "to_state",
];

const STATES = new Set(["OBSERVED", "CANONICAL", "ORPHANED"]);
const UINT64_MAX = 18446744073709551615n;
const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const HASH32_RE = /^0x[0-9a-f]{64}$/;

function fail(message) {
  throw new TypeError(message);
}

function assertCanonicalHash(value, field) {
  if (typeof value !== "string" || !HASH32_RE.test(value)) {
    fail(`${field} has invalid canonical hash form`);
  }
}

function assertCanonicalUint64(value, field) {
  if (typeof value !== "string") fail(`${field} must be a string`);
  if (!UINT64_RE.test(value)) fail(`${field} has invalid uint64 lexical form`);
  if (BigInt(value) > UINT64_MAX) fail(`${field} exceeds uint64 range`);
}

function assertExactKeys(value) {
  const keys = Object.keys(value).sort();
  const expected = [...REQUIRED_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail("transition input must contain exactly the five V4 transition keys");
  }
}

function assertLegalEdge(fromState, toState) {
  if (
    (fromState === "OBSERVED" && toState === "CANONICAL") ||
    (fromState === "CANONICAL" && toState === "ORPHANED")
  ) {
    return;
  }
  fail(`illegal V4 state transition: ${fromState} -> ${toState}`);
}

function validateTransitionInput(value, { first = false } = {}) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("transition input must be an object");
  }

  assertExactKeys(value);

  for (const key of ["evidence_id", "from_state", "sequence", "to_state"]) {
    if (typeof value[key] !== "string") fail(`${key} must be a string`);
  }

  assertCanonicalHash(value.evidence_id, "evidence_id");
  assertCanonicalUint64(value.sequence, "sequence");

  if (value.previous_transition_hash !== null) {
    assertCanonicalHash(value.previous_transition_hash, "previous_transition_hash");
  }

  if (!STATES.has(value.from_state)) fail("from_state has invalid V4 evidence state");
  if (!STATES.has(value.to_state)) fail("to_state has invalid V4 evidence state");

  assertLegalEdge(value.from_state, value.to_state);

  if (first) {
    if (value.sequence !== "0") fail('first transition sequence must be "0"');
    if (value.previous_transition_hash !== null) {
      fail("first transition previous_transition_hash must be null");
    }
    if (value.from_state !== "OBSERVED") {
      fail("first transition from_state must be OBSERVED");
    }
  }

  return value;
}

function hashTransition(input) {
  validateTransitionInput(input);
  return `0x${domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-TRANSITION", input).hash}`;
}

function validateTransitionRecord(record) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    fail("transition record must be an object");
  }
  if (!Object.prototype.hasOwnProperty.call(record, "input")) {
    fail("transition record missing input");
  }
  if (!Object.prototype.hasOwnProperty.call(record, "hash")) {
    fail("transition record missing hash");
  }
  validateTransitionInput(record.input);
  assertCanonicalHash(record.hash, "transition hash");

  const expected = hashTransition(record.input);
  if (record.hash !== expected) fail("transition hash mismatch");

  return record;
}

function validateTransitionChain(records) {
  if (!Array.isArray(records) || records.length === 0) {
    fail("transition chain must contain at least one record");
  }

  const validated = [];
  let previousSequence = null;
  let previousHash = null;

  for (let index = 0; index < records.length; index += 1) {
    const record = validateTransitionRecord(records[index]);
    const input = record.input;

    if (index === 0) {
      validateTransitionInput(input, { first: true });
    } else {
      const expectedSequence = (BigInt(previousSequence) + 1n).toString();
      if (input.sequence !== expectedSequence) {
        fail("transition chain sequence is not contiguous");
      }
      if (input.previous_transition_hash !== previousHash) {
        fail("transition chain predecessor does not match immediately preceding transition");
      }
    }

    previousSequence = input.sequence;
    previousHash = record.hash;
    validated.push(record);
  }

  return {
    records: validated,
    highest_contiguous_sequence: previousSequence,
    authoritative_state: validated[validated.length - 1].input.to_state,
    latest_transition_hash: previousHash,
  };
}

function classifyTransitionDuplicate(existing, candidate) {
  validateTransitionRecord(existing);
  validateTransitionRecord(candidate);

  if (canonicalize(existing.input) !== canonicalize(candidate.input)) {
    return "NOT_DUPLICATE";
  }

  if (existing.hash === candidate.hash) return "IDEMPOTENT";
  return "INTEGRITY_CONFLICT";
}

module.exports = {
  REQUIRED_KEYS,
  STATES,
  validateTransitionInput,
  hashTransition,
  validateTransitionRecord,
  validateTransitionChain,
  classifyTransitionDuplicate,
};
