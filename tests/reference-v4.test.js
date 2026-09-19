"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { canonicalize } = require("../src/reference/v4/jcs");
const { domainSeparatedHash } = require("../src/reference/v4/hash");
const { verifyVectorSet } = require("../scripts/verify-golden-vectors");

const fixture = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "payload-event-identity.json"
);

test("V4 reference canonicalization sorts object keys and removes whitespace", () => {
  assert.equal(
    canonicalize({ z: "last", a: "first", nested: { b: true, a: null } }),
    '{"a":"first","nested":{"a":null,"b":true},"z":"last"}'
  );
});

test("V4 reference canonicalization rejects non-finite numbers", () => {
  assert.throws(() => canonicalize({ value: Number.NaN }), /Non-finite number/);
  assert.throws(() => canonicalize({ value: Number.POSITIVE_INFINITY }), /Non-finite number/);
});

test("V4 reference canonicalization rejects lone surrogates", () => {
  assert.throws(() => canonicalize({ value: "\\ud800" }), /lone high surrogate/);
});

test("domain separation changes the digest", () => {
  const input = { a: "b" };
  const one = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-PAYLOAD", input);
  const two = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-TRANSITION", input);
  assert.notEqual(one.hash, two.hash);
});

test("golden vectors reproduce their stored canonical bytes and hashes", () => {
  const result = verifyVectorSet(fixture);
  assert.equal(result.count, 2);
});

test("golden vector verifier detects mutation", () => {
  const original = require(fixture);
  const mutated = structuredClone(original);
  mutated.vectors[0].input_object.block_number = "124";
  assert.notEqual(
    domainSeparatedHash(mutated.vectors[0].domain, mutated.vectors[0].input_object).hash,
    mutated.vectors[0].expected_hash
  );
});
