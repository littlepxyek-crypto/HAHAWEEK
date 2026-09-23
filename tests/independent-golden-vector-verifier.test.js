"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vectors = require("../docs/golden-vectors/checkpoint-cursor-recovery.json");
const verifier = require("../src/verification/independent-golden-vector-verifier");

test("independent verifier accepts every committed checkpoint/cursor/recovery vector", () => {
  const result = verifier.verifyGoldenVectorDocument(vectors);
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.verifier_version, "independent-golden-vector-verifier-v1");
  assert.equal(result.vector_count, 12);
  assert.equal(result.results.length, 12);
});

test("independent verifier reproduces frozen checkpoint hash", () => {
  const vector = vectors.vectors.find((item) => item.id === "checkpoint-genesis-valid");
  const result = verifier.domainSeparatedHash(vectors.checkpoint_domain, vector.input);
  assert.equal(result.hash, vector.expected_hash);
  assert.equal(
    result.canonicalUtf8Hex,
    Buffer.from('{"generation":"0","manifest_hash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}', "utf8").toString("hex"),
  );
});

test("independent verifier reproduces frozen cursor hash", () => {
  const vector = vectors.vectors.find((item) => item.id === "cursor-genesis-valid");
  const result = verifier.domainSeparatedHash(vectors.cursor_domain, vector.input);
  assert.equal(result.hash, vector.expected_hash);
});

test("independent verifier rejects duplicate vector identities", () => {
  const document = structuredClone(vectors);
  document.vectors.push(structuredClone(document.vectors[0]));
  assert.throws(() => verifier.verifyGoldenVectorDocument(document), /duplicate vector id/);
});

test("independent verifier rejects tampered expected hash", () => {
  const document = structuredClone(vectors);
  const vector = document.vectors.find((item) => item.id === "checkpoint-genesis-valid");
  vector.expected_hash = "00".repeat(32);
  assert.throws(() => verifier.verifyGoldenVectorDocument(document), /hash mismatch/);
});

test("independent verifier rejects malformed canonical input", () => {
  const document = structuredClone(vectors);
  const vector = document.vectors.find((item) => item.id === "checkpoint-genesis-valid");
  vector.input.generation = "07";
  assert.throws(() => verifier.verifyGoldenVectorDocument(document), /hash mismatch/);
});

test("independent verifier fails closed on recovery corruption", () => {
  const document = structuredClone(vectors);
  const vector = document.vectors.find((item) => item.id === "recovery-valid-chain");
  vector.manifest.segments_valid = false;
  assert.throws(() => verifier.verifyGoldenVectorDocument(document), /expected result mismatch/);
});
