"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  verifyCheckpoint,
  verifyCheckpointRecord,
  verifyCursor,
  verifyCursorRecord,
  verifyRecovery,
} = require("../src/verification/independent-recovery-verifier");

const vectors = require("../docs/golden-vectors/checkpoint-cursor-recovery.json");

function vector(id) {
  const found = vectors.vectors.find((item) => item.id === id);
  assert.ok(found, `missing vector ${id}`);
  return found;
}

function cursorRecordForRecovery(v) {
  const checkpoint = {
    hash: v.checkpoint.hash,
    generation: v.checkpoint.input.generation,
  };
  const verified = verifyCursor(v.cursor.input, checkpoint);
  return { input: v.cursor.input, hash: verified.hash };
}

test("independent verifier accepts the valid checkpoint digest", () => {
  const v = vector("checkpoint-genesis-valid");
  const result = verifyCheckpoint(v.input, v.manifest);
  assert.equal(result.hash, `0x${v.expected_hash}`);
});

test("independent verifier rejects a mutated checkpoint digest", () => {
  const v = vector("checkpoint-genesis-valid");
  assert.throws(
    () => verifyCheckpointRecord({
      input: v.input,
      hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }, v.manifest),
    /checkpoint digest mismatch/,
  );
});

test("independent verifier rejects checkpoint/manifest mismatch", () => {
  const v = vector("checkpoint-manifest-hash-mismatch");
  assert.throws(() => verifyCheckpoint(v.input, v.manifest), /checkpoint\/manifest hash mismatch/);
});

test("independent verifier rejects missing manifest", () => {
  const v = vector("checkpoint-manifest-missing");
  assert.throws(() => verifyCheckpoint(v.input, v.manifest), /manifest is missing/);
});

test("independent verifier rejects noncanonical uint64", () => {
  const v = vector("checkpoint-generation-noncanonical");
  assert.throws(() => verifyCheckpoint(v.input, v.manifest), /canonical uint64 decimal/);
});

test("independent verifier accepts the valid cursor digest", () => {
  const v = vector("cursor-genesis-valid");
  const result = verifyCursor(v.input, v.checkpoint);
  assert.equal(result.hash, `0x${v.expected_hash}`);
});

test("independent verifier rejects cursor/checkpoint mismatch", () => {
  const v = vector("cursor-checkpoint-mismatch");
  assert.throws(
    () => verifyCursor(v.input, v.checkpoint),
    /cursor\/checkpoint hash mismatch/,
  );
});

test("independent verifier rejects cursor ahead of checkpoint", () => {
  const v = vector("cursor-ahead-of-checkpoint");
  assert.throws(
    () => verifyCursor(v.input, v.checkpoint),
    /exceeds checkpoint/,
  );
});

test("independent verifier rejects a mutated cursor digest", () => {
  const v = vector("cursor-genesis-valid");
  assert.throws(
    () => verifyCursorRecord({
      input: v.input,
      hash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    }, v.checkpoint),
    /cursor digest mismatch/,
  );
});

test("independent verifier accepts the valid recovery chain", () => {
  const v = vector("recovery-valid-chain");
  const checkpoint = {
    input: v.checkpoint.input,
    hash: v.checkpoint.hash,
  };
  const cursor = cursorRecordForRecovery(v);

  const result = verifyRecovery({
    manifest: v.manifest,
    checkpoint,
    cursor,
    acquisition_position_valid: v.acquisition_position_valid,
  });

  assert.equal(result.status, "RECOVERY_RESUME_ALLOWED");
});

test("independent verifier fails closed on corrupt segments", () => {
  const v = vector("recovery-fail-closed-corrupt-segment");
  const checkpoint = {
    input: v.checkpoint.input,
    hash: v.checkpoint.hash,
  };
  const cursor = cursorRecordForRecovery(v);

  assert.throws(
    () => verifyRecovery({
      manifest: v.manifest,
      checkpoint,
      cursor,
      acquisition_position_valid: v.acquisition_position_valid,
    }),
    /manifest inventory or segments are not verified/,
  );
});

test("independent verifier rejects invalid acquisition position", () => {
  const v = vector("recovery-valid-chain");
  const checkpoint = { input: v.checkpoint.input, hash: v.checkpoint.hash };
  const cursor = cursorRecordForRecovery(v);

  assert.throws(
    () => verifyRecovery({
      manifest: v.manifest,
      checkpoint,
      cursor,
      acquisition_position_valid: false,
    }),
    /acquisition position is not verified/,
  );
});

test("independent verifier rejects unknown recovery keys", () => {
  const v = vector("recovery-valid-chain");
  assert.throws(
    () => verifyRecovery({
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: v.cursor,
      acquisition_position_valid: true,
      extra: "reject",
    }),
    /non-canonical key set/,
  );
});

test("independent verifier has no production-reference dependency", () => {
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "..", "src", "verification", "independent-recovery-verifier.js"),
    "utf8",
  );
  assert.doesNotMatch(source, /src\/reference\/v4/);
});
