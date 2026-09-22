"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  IDENTITY_DOMAIN,
  createIdentityPayload,
  createEvidenceIdentity,
  hashRawEvidence,
  hashCanonicalEvidence,
} = require("../src/core/evidence-identity");

function makeEvidence(overrides = {}) {
  return {
    evidence_id: "ce:raw-001",
    evidence_type: "RAW_LOG",
    chain_id: 4663,
    location: {
      block_number: 123,
      block_hash: "0x" + "a".repeat(64),
      transaction_hash: "0x" + "b".repeat(64),
      transaction_index: 4,
      log_index: 7,
    },
    contract_address: "0x" + "c".repeat(40),
    topics: ["0x" + "d".repeat(64)],
    data: "0x",
    raw_reference: { event_id: "raw-001" },
    interpretation_status: "UNINTERPRETED",
    provenance_reference: { raw_event_id: "raw-001", chain_id: 4663 },
    ...overrides,
  };
}

test("golden identity vector reproduces canonical bytes and hash", () => {\n  const vector = require(path.join(__dirname, "..", "docs", "golden-vectors", "evidence-identity.json")).vectors[0];\n  const actual = domainSeparatedHash(vector.domain, vector.input_object);\n  assert.equal(actual.canonicalUtf8Hex, vector.canonical_utf8_hex);\n  assert.equal(actual.hash, vector.expected_hash);\n});\n\ntest("identity is deterministic and distinct from transaction hash", () => {
  const result = createEvidenceIdentity(makeEvidence());
  assert.match(result.evidence_id, /^ei:v1:[0-9a-f]{64}$/);
  assert.equal(result.identity_domain, IDENTITY_DOMAIN);
  assert.notEqual(result.evidence_id, makeEvidence().location.transaction_hash);
  assert.equal(result.identity_payload.chain_id, "4663");
  assert.equal(result.identity_payload.block_number, "123");
});

test("same evidence produces the same identity", () => {
  assert.deepEqual(
    createEvidenceIdentity(makeEvidence()),
    createEvidenceIdentity(makeEvidence())
  );
});

test("different log index produces a different identity", () => {
  const a = createEvidenceIdentity(makeEvidence());
  const b = createEvidenceIdentity(
    makeEvidence({
      location: { ...makeEvidence().location, log_index: 8 },
    })
  );
  assert.notEqual(a.evidence_id, b.evidence_id);
});

test("different block hash produces a different identity", () => {
  const a = createEvidenceIdentity(makeEvidence());
  const b = createEvidenceIdentity(
    makeEvidence({
      location: {
        ...makeEvidence().location,
        block_hash: "0x" + "e".repeat(64),
      },
    })
  );
  assert.notEqual(a.evidence_id, b.evidence_id);
});

test("different canonical content at the same location keeps identity but changes canonical hash", () => {
  const a = makeEvidence();
  const b = makeEvidence({ data: "0x01" });
  assert.equal(createEvidenceIdentity(a).evidence_id, createEvidenceIdentity(b).evidence_id);
  assert.notEqual(hashCanonicalEvidence(a), hashCanonicalEvidence(b));
});

test("raw and canonical hashes are separate domains", () => {
  const raw = {
    event_id: "raw-001",
    chain_id: 4663,
    block_number: 123,
    transaction_hash: "0x" + "b".repeat(64),
    block_hash: "0x" + "a".repeat(64),
    transaction_index: 4,
    log_index: 7,
    address: "0x" + "c".repeat(40),
    topics: ["0x" + "d".repeat(64)],
    data: "0x",
  };
  const canonical = makeEvidence();
  assert.notEqual(hashRawEvidence(raw), hashCanonicalEvidence(canonical));
});

test("identity requires block hash and transaction index", () => {
  const missingBlockHash = makeEvidence({
    location: { ...makeEvidence().location, block_hash: null },
  });
  assert.throws(
    () => createEvidenceIdentity(missingBlockHash),
    /block_hash is required/
  );

  const missingTransactionIndex = makeEvidence({
    location: { ...makeEvidence().location, transaction_index: null },
  });
  assert.throws(
    () => createEvidenceIdentity(missingTransactionIndex),
    /transaction_index is required/
  );
});

test("identity payload uses explicit canonical lexical forms", () => {
  const payload = createIdentityPayload(makeEvidence());
  assert.deepEqual(payload, {
    block_hash: "0x" + "a".repeat(64),
    block_number: "123",
    chain_id: "4663",
    contract_address: "0x" + "c".repeat(40),
    log_index: "7",
    transaction_hash: "0x" + "b".repeat(64),
    transaction_index: "4",
  });
});
