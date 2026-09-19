"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyCheckpoint, verifyCursor, verifyRecovery } = require("../src/reference/v4/recovery-verifier");
const vectors = require("../docs/golden-vectors/checkpoint-cursor-recovery.json");
function vector(id) { const found = vectors.vectors.find((v) => v.id === id); assert.ok(found, "missing vector " + id); return found; }
test("offline verifier accepts the valid checkpoint vector", () => {
  const v = vector("checkpoint-genesis-valid");
  const result = verifyCheckpoint(v.input, v.manifest);
  assert.equal(result.hash, "0x" + v.expected_hash);
});
test("offline verifier accepts the valid cursor vector", () => {
  const v = vector("cursor-genesis-valid");
  const result = verifyCursor(v.input, v.checkpoint);
  assert.equal(result.hash, "0x" + v.expected_hash);
});
test("offline verifier accepts the valid recovery chain", () => {
  const v = vector("recovery-valid-chain");
  const result = verifyRecovery({ manifest: { ...v.manifest, generation: v.checkpoint.input.generation }, checkpoint: v.checkpoint.input, cursor: v.cursor.input, acquisition_position_valid: v.acquisition_position_valid });
  assert.equal(result.status, "RECOVERY_RESUME_ALLOWED");
});
test("offline verifier fails closed on corrupt segments", () => {
  const v = vector("recovery-fail-closed-corrupt-segment");
  assert.throws(() => verifyRecovery({ manifest: { ...v.manifest, generation: v.checkpoint.input.generation }, checkpoint: v.checkpoint.input, cursor: v.cursor.input, acquisition_position_valid: v.acquisition_position_valid }), /manifest inventory or segments are not verified/);
});
test("offline verifier rejects a cursor ahead of checkpoint", () => {
  const v = vector("cursor-ahead-of-checkpoint");
  assert.throws(() => verifyCursor(v.input, v.checkpoint), /exceeds checkpoint/);
});
test("offline verifier rejects checkpoint generation mismatch", () => {
  const v = vector("checkpoint-later-valid");
  assert.throws(() => verifyCheckpoint(v.input, { ...v.manifest, generation: "8" }), /generation mismatch/);
});
test("offline verifier rejects unknown recovery keys", () => {
  const v = vector("recovery-valid-chain");
  assert.throws(() => verifyRecovery({ manifest: { ...v.manifest, generation: v.checkpoint.input.generation }, checkpoint: v.checkpoint.input, cursor: v.cursor.input, acquisition_position_valid: true, extra: "reject" }), /non-canonical key set/);
});