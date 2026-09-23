"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  validateTransitionInput,
  hashTransition,
  validateTransitionChain,
  classifyTransitionDuplicate,
} = require("../src/reference/v4/transition");
const { domainSeparatedHash } = require("../src/reference/v4/hash");

const fixture = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "transition.json"
);
const vectorSet = require(fixture);
const first = vectorSet.vectors[0].input_object;
const second = vectorSet.vectors[1].input_object;
const maxUint64 = vectorSet.vectors[2].input_object;

function record(input) {
  return { input, hash: hashTransition(input) };
}

test("V4 transition golden vectors reproduce canonical bytes and hashes", () => {
  for (const vector of vectorSet.vectors) {
    const actual = domainSeparatedHash(vector.domain, vector.input_object);
    assert.equal(actual.canonicalUtf8Hex, vector.canonical_utf8_hex);
    assert.equal(actual.hash, vector.expected_hash);
    assert.equal(hashTransition(vector.input_object), `0x${vector.expected_hash}`);
  }
});

test("V4 transition accepts the canonical first transition", () => {
  assert.deepEqual(validateTransitionInput(first, { first: true }), first);
});

test("V4 transition accepts a maximum uint64 lexical value", () => {
  assert.deepEqual(validateTransitionInput(maxUint64), maxUint64);
});

test("V4 transition chain accepts contiguous predecessor-linked transitions", () => {
  const result = validateTransitionChain([record(first), record(second)]);
  assert.equal(result.highest_contiguous_sequence, "1");
  assert.equal(result.authoritative_state, "ORPHANED");
  assert.equal(result.latest_transition_hash, hashTransition(second));
});

const negatives = [
  ["missing key", (() => { const x = { ...first }; delete x.to_state; return x; })(), /exactly the five V4 transition keys/],
  ["unknown key", { ...first, extra: "x" }, /exactly the five V4 transition keys/],
  ["wrong sequence type", { ...first, sequence: 0 }, /sequence must be a string/],
  ["leading-zero sequence", { ...first, sequence: "00" }, /invalid uint64 lexical form/],
  ["signed sequence", { ...first, sequence: "+1" }, /invalid uint64 lexical form/],
  ["overflow sequence", { ...first, sequence: "18446744073709551616" }, /exceeds uint64 range/],
  ["invalid evidence hash", { ...first, evidence_id: "0x" + "A".repeat(64) }, /invalid canonical hash form/],
  ["invalid predecessor hash", { ...second, previous_transition_hash: "0x" + "f".repeat(63) }, /invalid canonical hash form/],
  ["first non-zero sequence", { ...first, sequence: "1" }, /first transition sequence must be "0"/],
  ["first non-null predecessor", { ...first, previous_transition_hash: hashTransition(first) }, /first transition previous_transition_hash must be null/],
  ["wrong first from_state", { ...first, from_state: "CANONICAL", to_state: "ORPHANED" }, /first transition from_state must be OBSERVED/],
  ["illegal state edge", { ...first, to_state: "ORPHANED" }, /illegal V4 state transition/],
  ["ORPHANED terminal violation", { ...second, from_state: "ORPHANED", to_state: "CANONICAL" }, /illegal V4 state transition/],
];

for (const [name, input, expected] of negatives) {
  test(`V4 transition negative vector: ${name}`, () => {
    const firstContext = name.includes("first");
    assert.throws(() => validateTransitionInput(input, { first: firstContext }), expected);
  });
}

test("V4 transition chain rejects a sequence gap", () => {
  const gap = { ...second, sequence: "2" };
  assert.throws(() => validateTransitionChain([record(first), record(gap)]), /sequence is not contiguous/);
});

test("V4 transition chain rejects duplicate or backward sequence", () => {
  const duplicate = { ...second, sequence: "0", previous_transition_hash: hashTransition(first) };
  const backward = { ...second, sequence: "0" };
  assert.throws(() => validateTransitionChain([record(first), record(duplicate)]), /sequence is not contiguous/);
  assert.throws(() => validateTransitionChain([record(first), record(backward)]), /sequence is not contiguous/);
});

test("V4 transition chain rejects predecessor mutation and fork", () => {
  const mutated = { ...second, previous_transition_hash: "0x" + "e".repeat(64) };
  assert.throws(() => validateTransitionChain([record(first), record(mutated)]), /predecessor does not match/);

  const fork = { ...second, to_state: "ORPHANED", previous_transition_hash: "0x" + "f".repeat(64) };
  assert.throws(() => validateTransitionChain([record(first), record(fork)]), /predecessor does not match/);
});

test("V4 transition chain rejects a transition hash mutation", () => {
  const bad = { input: first, hash: "0x" + "0".repeat(64) };
  assert.throws(() => validateTransitionChain([bad]), /transition hash mismatch/);
});

test("V4 transition duplicate classification distinguishes idempotence and conflict", () => {
  const existing = record(first);
  const same = record({ ...first });
  assert.equal(classifyTransitionDuplicate(existing, same), "IDEMPOTENT");

  const conflict = { input: { ...first }, hash: "0x" + "0".repeat(64) };
  assert.equal(classifyTransitionDuplicate(existing, conflict), "INTEGRITY_CONFLICT");

  const different = record(second);
  assert.equal(classifyTransitionDuplicate(existing, different), "NOT_DUPLICATE");
});
