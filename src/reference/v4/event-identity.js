"use strict";

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

function fail(message) {
  throw new TypeError(message);
}

function assertCanonicalUint64(value, field) {
  if (typeof value !== "string") fail(`${field} must be a string`);
  if (!UINT64_RE.test(value)) fail(`${field} has invalid uint64 lexical form`);
  if (BigInt(value) > UINT64_MAX) fail(`${field} exceeds uint64 range`);
}

function assertCanonicalHex(value, field, pattern) {
  if (typeof value !== "string") fail(`${field} must be a string`);
  if (!pattern.test(value)) fail(`${field} has invalid canonical hexadecimal form`);
}

function validateEventIdentity(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("event identity must be an object");
  }

  const keys = Object.keys(value).sort();
  const expected = [...REQUIRED_KEYS].sort();

  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) {
    fail("event identity must contain exactly the eight V4 identity keys");
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof value[key] !== "string") fail(`${key} must be a string`);
  }

  assertCanonicalUint64(value.chain_id, "chain_id");
  assertCanonicalUint64(value.block_number, "block_number");
  assertCanonicalUint64(value.transaction_index, "transaction_index");
  assertCanonicalUint64(value.log_index, "log_index");

  assertCanonicalHex(value.block_hash, "block_hash", HASH32_RE);
  assertCanonicalHex(value.transaction_hash, "transaction_hash", HASH32_RE);
  assertCanonicalHex(value.contract_address, "contract_address", ADDRESS20_RE);
  assertCanonicalHex(value.topic0, "topic0", HASH32_RE);

  return value;
}

module.exports = { REQUIRED_KEYS, validateEventIdentity };
