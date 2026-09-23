"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("../docs/golden-vectors/f02-reorg-scenario.json");
const { validateScenario, transitionHash, clone } = require("../src/v4/f02-reorg-verifier");

function run(mutator) {
  const value = clone(fixture);
  mutator(value);
  return () => validateScenario(value);
}

test("F-02 positive: canonical and orphaned records coexist and recovery is deterministic", () => {
  const result = validateScenario(clone(fixture));
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.authoritative_contiguous_sequence, "1");
  assert.equal(result.preserved_record_count, 3);
  assert.equal(result.recovery.deterministic, true);
});

test("F-02 positive: supplied transition hashes are independently reproducible", () => {
  for (const record of fixture.histories.canonical) {
    assert.equal(transitionHash(record.transition), record.transition_hash);
  }
});

test("F-02 negative: competing predecessor fails closed", () => {
  assert.throws(run(value => {
    value.histories.canonical[1].transition.previous_transition_hash =
      value.histories.competing[0].transition_hash;
  }), /PREDECESSOR_MISMATCH|TRANSITION_DIGEST_MISMATCH/);
});

test("F-02 negative: recovery sequence gap fails closed", () => {
  assert.throws(run(value => {
    value.recovery_prefix = [
      value.histories.canonical[1].transition_hash
    ];
  }), /RECOVERY_PREFIX_NOT_CONTIGUOUS/);
});

test("F-02 negative: conflicting duplicate identity fails closed", () => {
  assert.throws(run(value => {
    const duplicate = clone(value.histories.canonical[1]);
    duplicate.transition.to_state = "CANONICAL";
    duplicate.transition_hash = transitionHash(duplicate.transition);
    value.histories.canonical.push(duplicate);
  }), /INTEGRITY_CONFLICT|SEQUENCE_GAP|PREDECESSOR_MISMATCH|INVALID_TRANSITION_EDGE/);
});

test("F-02 negative: cross-history identity collision fails closed", () => {
  assert.throws(run(value => {
    const duplicate = clone(value.histories.canonical[1]);
    duplicate.transition.previous_transition_hash = value.histories.competing[0].transition_hash;
    duplicate.transition_hash = transitionHash(duplicate.transition);
    duplicate.provenance.block_id = "block-C-101";
    value.histories.competing.push(duplicate);
  }), /INTEGRITY_CONFLICT/);
});

test("F-02 negative: missing provenance fails closed", () => {
  assert.throws(run(value => {
    delete value.histories.canonical[1].provenance.block_id;
  }), /MISSING_PROVENANCE_BLOCK_ID/);
});

test("F-02 negative: mismatched provenance fails closed", () => {
  assert.throws(run(value => {
    value.histories.canonical[1].provenance.evidence_id =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
  }), /PROVENANCE_EVIDENCE_MISMATCH/);
});

test("F-02 negative: historical mutation is detected", () => {
  const value = clone(fixture);
  value.histories.canonical[1].transition.to_state = "CANONICAL";
  assert.throws(() => validateScenario(value), /INVALID_TRANSITION_EDGE/);
});

test("F-02 negative: preserved inventory omission is rejected", () => {
  const value = clone(fixture);
  value.preserved_records.pop();
  assert.throws(() => validateScenario(value), /HISTORICAL_RECORD_NOT_PRESERVED/);
});

test("F-02 positive: verifier itself does not mutate fixture", () => {
  const value = clone(fixture);
  const before = JSON.stringify(value);
  validateScenario(value);
  assert.equal(JSON.stringify(value), before);
});
