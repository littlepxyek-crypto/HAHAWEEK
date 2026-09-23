"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { RESULTS, detectReorg } = require("../src/core/reorg-detector");

const fixturePath = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "f02d-reorg-detector.json",
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

for (const vector of fixture.cases) {
  test(`F-02D golden vector: ${vector.id}`, () => {
    assert.equal(detectReorg(vector.input), vector.expected);
  });
}

test("F-02D detector is deterministic", () => {
  const input = {
    previousBlockNumber: 10,
    previousHash: "0xaaa",
    currentBlockNumber: 11,
    currentHash: "0xbbb",
    currentParentHash: "0xaaa",
  };

  assert.equal(detectReorg(input), RESULTS.CONTINUOUS);
  assert.equal(detectReorg(input), RESULTS.CONTINUOUS);
});

test("F-02D detector has no state side effects", () => {
  const input = {
    previousBlockNumber: 10,
    previousHash: "0xaaa",
    currentBlockNumber: 11,
    currentHash: "0xbbb",
    currentParentHash: "0xccc",
  };

  assert.equal(detectReorg(input), RESULTS.REORG_DETECTED);
  assert.deepEqual(input, {
    previousBlockNumber: 10,
    previousHash: "0xaaa",
    currentBlockNumber: 11,
    currentHash: "0xbbb",
    currentParentHash: "0xccc",
  });
});
