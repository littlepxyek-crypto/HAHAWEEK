"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getBlockWithRetry, isRetryableRpcError } = require("../src/core/rpc-retry");

test("historical block read retries transient ECONNRESET and succeeds", async () => {
  let calls = 0;
  const retries = [];
  const provider = {
    async getBlock(blockNumber) {
      calls += 1;
      assert.equal(blockNumber, 59281988);
      if (calls < 3) {
        const error = new Error("read ECONNRESET");
        error.code = "ECONNRESET";
        throw error;
      }
      return { number: blockNumber, timestamp: 123 };
    },
  };

  const result = await getBlockWithRetry(provider, 59281988, {
    baseDelayMs: 0,
    maxDelayMs: 0,
    jitterRatio: 0,
    random: () => 0,
    sleep: async () => {},
    onRetry: event => retries.push(event),
  });

  assert.equal(result.block.number, 59281988);
  assert.equal(result.attempts, 3);
  assert.equal(result.retries, 2);
  assert.equal(calls, 3);
  assert.equal(retries.length, 2);
  assert.equal(retries[0].error_code, "ECONNRESET");
});

test("non-transient historical block error fails closed without retry", async () => {
  let calls = 0;
  const provider = {
    async getBlock() {
      calls += 1;
      throw new Error("invalid block parameter");
    },
  };

  await assert.rejects(
    getBlockWithRetry(provider, 1, { sleep: async () => {} }),
    /invalid block parameter/
  );
  assert.equal(calls, 1);
});

test("retry classification recognizes transport reset but not arbitrary errors", () => {
  assert.equal(isRetryableRpcError(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })), true);
  assert.equal(isRetryableRpcError(new Error("invalid block parameter")), false);
});
