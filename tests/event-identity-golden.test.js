"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { domainSeparatedHash } = require("../src/reference/v4/hash");
const { validateEventIdentity } = require("../src/reference/v4/event-identity");
const { verifyVectorSet } = require("../scripts/verify-golden-vectors");

const fixture = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "event-identity.json"
);

const vectorSet = require(fixture);
const identity = vectorSet.vectors[0].input_object;

test("V4 event identity golden vector is lexically valid", () => {
  assert.deepEqual(validateEventIdentity(identity), identity);
});

test("V4 event identity golden vector reproduces canonical bytes and hash", () => {
  const vector = vectorSet.vectors[0];
  const actual = domainSeparatedHash(vector.domain, vector.input_object);
  assert.equal(actual.canonicalUtf8Hex, vector.canonical_utf8_hex);
  assert.equal(actual.hash, vector.expected_hash);
  assert.equal(verifyVectorSet(fixture).count, 1);
});

const mutations = [
  ["chain_id leading zero", { chain_id: "04663" }, /invalid uint64 lexical form/],
  ["block_number overflow", { block_number: "18446744073709551616" }, /exceeds uint64 range/],
  ["transaction_index number type", { transaction_index: 4 }, /transaction_index must be a string/],
  ["log_index sign", { log_index: "+7" }, /invalid uint64 lexical form/],
  ["block_hash uppercase", { block_hash: identity.block_hash.toUpperCase() }, /invalid canonical hexadecimal form/],
  ["transaction_hash missing prefix", { transaction_hash: identity.transaction_hash.slice(2) }, /invalid canonical hexadecimal form/],
  ["contract_address wrong length", { contract_address: "0x" + "c".repeat(39) }, /invalid canonical hexadecimal form/],
  ["topic0 uppercase", { topic0: identity.topic0.toUpperCase() }, /invalid canonical hexadecimal form/],
  ["unknown key", { extra: "x" }, /exactly the eight V4 identity keys/],
  ["missing key", { topic0: undefined }, /exactly the eight V4 identity keys/],
];

for (const [name, mutation, expected] of mutations) {
  test(`V4 event identity negative vector: ${name}`, () => {
    const mutated = { ...identity, ...mutation };
    assert.throws(() => validateEventIdentity(mutated), expected);
  });
}
