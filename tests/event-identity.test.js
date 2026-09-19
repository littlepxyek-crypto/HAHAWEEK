"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEventIdentity } = require("../src/reference/v4/event-identity");

const VALID = {
  chain_id: "4663",
  block_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  block_number: "123",
  transaction_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  transaction_index: "4",
  log_index: "7",
  contract_address: "0xcccccccccccccccccccccccccccccccccccccccc",
  topic0: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
};

test("V4 event identity accepts canonical lexical contract", () => {
  assert.deepEqual(validateEventIdentity(VALID), VALID);
});

test("V4 event identity rejects missing and unknown keys", () => {
  const missing = { ...VALID };
  delete missing.topic0;
  assert.throws(() => validateEventIdentity(missing), /exactly the eight V4 identity keys/);
  const unknown = { ...VALID, extra: "x" };
  assert.throws(() => validateEventIdentity(unknown), /exactly the eight V4 identity keys/);
});

for (const field of ["chain_id", "block_number", "transaction_index", "log_index"]) {
  test(`rejects non-string ${field}`, () => {
    assert.throws(() => validateEventIdentity({ ...VALID, [field]: 1 }), new RegExp(`${field} must be a string`));
  });
  test(`rejects non-canonical ${field}`, () => {
    assert.throws(() => validateEventIdentity({ ...VALID, [field]: "01" }), /invalid uint64 lexical form/);
  });
  test(`rejects overflow in ${field}`, () => {
    assert.throws(() => validateEventIdentity({ ...VALID, [field]: "18446744073709551616" }), /exceeds uint64 range/);
  });
}

for (const field of ["block_hash", "transaction_hash", "topic0"]) {
  test(`rejects non-canonical ${field}`, () => {
    assert.throws(() => validateEventIdentity({ ...VALID, [field]: VALID[field].toUpperCase() }), /invalid canonical hexadecimal form/);
  });
  test(`rejects wrong length ${field}`, () => {
    assert.throws(() => validateEventIdentity({ ...VALID, [field]: "0x" + "a".repeat(63) }), /invalid canonical hexadecimal form/);
  });
}

test("rejects non-canonical contract address", () => {
  assert.throws(() => validateEventIdentity({ ...VALID, contract_address: "0x" + "A".repeat(40) }), /invalid canonical hexadecimal form/);
});

test("rejects whitespace and null", () => {
  assert.throws(() => validateEventIdentity({ ...VALID, block_number: " 123" }), /invalid uint64 lexical form/);
  assert.throws(() => validateEventIdentity({ ...VALID, topic0: null }), /topic0 must be a string/);
});

test("accepts uint64 maximum", () => {
  const value = { ...VALID, log_index: "18446744073709551615" };
  assert.deepEqual(validateEventIdentity(value), value);
});
