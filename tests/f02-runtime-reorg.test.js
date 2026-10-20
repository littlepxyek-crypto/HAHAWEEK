"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ReorgFixture } = require("./fixtures/reorg-runtime-fixture");

function evidence(id, digest) {
  return { id, digest, block: id === "E1" ? 100 : 100 };
}

test("F-02B preserves historical evidence across a reorg", () => {
  const ledger = new ReorgFixture();

  ledger.observe(evidence("E1", "digest-A"));
  ledger.orphan("E1", "E2");
  ledger.observe(evidence("E2", "digest-B"));

  const e1 = ledger.evidence.get("E1");
  const e2 = ledger.evidence.get("E2");

  assert.equal(e1.state, "ORPHANED");
  assert.equal(e2.state, "CANONICAL");
  assert.equal(ledger.evidence.size, 2);
  assert.deepEqual(
    ledger.transitions.map((item) => [item.evidence_id, item.from, item.to]),
    [
      ["E1", "OBSERVED", "CANONICAL"],
      ["E1", "CANONICAL", "ORPHANED"],
      ["E2", "OBSERVED", "CANONICAL"],
    ],
  );
});

test("F-02B does not merge replacement evidence identity", () => {
  const ledger = new ReorgFixture();

  ledger.observe(evidence("E1", "digest-A"));
  ledger.orphan("E1", "E2");
  ledger.observe(evidence("E2", "digest-A"));

  assert.notEqual(ledger.evidence.get("E1"), ledger.evidence.get("E2"));
  assert.equal(ledger.evidence.get("E1").state, "ORPHANED");
  assert.equal(ledger.evidence.get("E2").state, "CANONICAL");
});

test("F-02B duplicate replay is idempotent", () => {
  const ledger = new ReorgFixture();

  assert.equal(ledger.observe(evidence("E1", "digest-A")), "INSERTED");
  assert.equal(ledger.observe(evidence("E1", "digest-A")), "IDEMPOTENT");
  assert.equal(ledger.evidence.size, 1);
  assert.equal(ledger.transitions.length, 1);
});

test("F-02B conflicting replay is an integrity conflict", () => {
  const ledger = new ReorgFixture();

  ledger.observe(evidence("E1", "digest-A"));
  assert.throws(
    () => ledger.observe(evidence("E1", "digest-B")),
    /INTEGRITY_CONFLICT/,
  );
});

test("F-02B cursor does not outrun uncommitted reorg evidence", () => {
  const ledger = new ReorgFixture();

  ledger.observe(evidence("E1", "digest-A"));
  assert.equal(ledger.cursor, null);

  ledger.orphan("E1", "E2");
  ledger.observe(evidence("E2", "digest-B"));

  assert.equal(ledger.cursor, null);
  ledger.commitCursor(100);
  assert.equal(ledger.cursor, 100);
});

test("F-02B restart preserves canonical/orphaned state", () => {
  const first = new ReorgFixture();

  first.observe(evidence("E1", "digest-A"));
  first.orphan("E1", "E2");
  first.observe(evidence("E2", "digest-B"));
  first.commitCursor(100);

  const snapshot = first.snapshot();
  const restarted = new ReorgFixture();
  restarted.restore(snapshot);

  assert.deepEqual(restarted.snapshot(), snapshot);
});

test("F-02B crash before cursor commit can be replayed safely", () => {
  const beforeCrash = new ReorgFixture();

  beforeCrash.observe(evidence("E1", "digest-A"));
  beforeCrash.orphan("E1", "E2");
  beforeCrash.observe(evidence("E2", "digest-B"));

  const durableEvidence = beforeCrash.snapshot();
  durableEvidence.cursor = null;

  const restarted = new ReorgFixture();
  restarted.restore(durableEvidence);

  assert.equal(restarted.cursor, null);
  assert.equal(restarted.evidence.get("E1").state, "ORPHANED");
  assert.equal(restarted.evidence.get("E2").state, "CANONICAL");

  restarted.commitCursor(100);
  assert.equal(restarted.cursor, 100);
});

test("F-02B rejects illegal orphan transition", () => {
  const ledger = new ReorgFixture();

  ledger.observe(evidence("E1", "digest-A"));
  ledger.orphan("E1", "E2");

  assert.throws(
    () => ledger.orphan("E1", "E3"),
    /INVALID_REORG_STATE/,
  );
});
