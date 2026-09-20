"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const REQUIRED_KEYS = [
  "chain_id",
  "block_hash",
  "block_number",
  "transaction_hash",
  "transaction_index",
  "log_index",
  "contract_address",
  "topic0",
];

const UINT64_MAX = 18446744073709551615n;
const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const HASH32_RE = /^0x[0-9a-f]{64}$/;
const ADDRESS20_RE = /^0x[0-9a-f]{40}$/;
const DOMAIN = "HAHAWEEK-EVIDENCE-V4-PAYLOAD";

function fail(message) {
  throw new Error(message);
}

function validateIdentity(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("input_object must be an object");
  }

  const actual = Object.keys(input).sort();
  const expected = [...REQUIRED_KEYS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("input_object does not contain exactly the eight V4 identity keys");
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof input[key] !== "string") fail(key + " must be a string");
  }

  for (const key of ["chain_id", "block_number", "transaction_index", "log_index"]) {
    if (!UINT64_RE.test(input[key])) fail(key + " has non-canonical uint64 form");
    if (BigInt(input[key]) > UINT64_MAX) fail(key + " exceeds uint64");
  }

  for (const key of ["block_hash", "transaction_hash", "topic0"]) {
    if (!HASH32_RE.test(input[key])) fail(key + " has non-canonical 32-byte hash form");
  }

  if (!ADDRESS20_RE.test(input.contract_address)) {
    fail("contract_address has non-canonical 20-byte address form");
  }
}

function canonicalizeStringObject(input) {
  validateIdentity(input);
  const ordered = {};
  for (const key of Object.keys(input).sort()) ordered[key] = input[key];
  return JSON.stringify(ordered);
}

function verify(filePath) {
  const set = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (set.protocol !== "HAHAWEEK-EVIDENCE-V4") fail("invalid protocol");
  if (!Array.isArray(set.vectors) || set.vectors.length === 0) fail("empty vector set");

  for (const vector of set.vectors) {
    if (vector.domain !== DOMAIN) fail(vector.vector_id + ": unexpected domain");
    const canonical = canonicalizeStringObject(vector.input_object);
    const bytes = Buffer.from(canonical, "utf8");
    const canonicalHex = bytes.toString("hex");
    if (canonicalHex !== vector.canonical_utf8_hex) {
      fail(vector.vector_id + ": canonical bytes mismatch");
    }

    const preimage = Buffer.concat([
      Buffer.from(DOMAIN, "utf8"),
      Buffer.from([0]),
      bytes,
    ]);
    const hash = crypto.createHash("sha256").update(preimage).digest("hex");
    if (hash !== vector.expected_hash) fail(vector.vector_id + ": hash mismatch");
  }

  return set.vectors.length;
}

if (require.main === module) {
  const filePath = process.argv[2] || path.join(
    __dirname, "..", "docs", "golden-vectors", "event-identity.json"
  );
  process.stdout.write("independently verified " + verify(filePath) + " V4 event-identity vector(s)\\n");
}

module.exports = { verify };
