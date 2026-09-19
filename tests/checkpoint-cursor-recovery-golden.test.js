"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { domainSeparatedHash } = require("../src/reference/v4/hash");
const vectors = require("../docs/golden-vectors/checkpoint-cursor-recovery.json");

const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const UINT64_MAX = 18446744073709551615n;
const HASH32_RE = /^0x[0-9a-f]{64}$/;

function validUint64(value) {
  return typeof value === "string" && UINT64_RE.test(value) && BigInt(value) <= UINT64_MAX;
}

function validHash(value) {
  return typeof value === "string" && HASH32_RE.test(value);
}

function checkpointResult(v) {
  const keys = Object.keys(v.input).sort();
  if (keys.join(",") !== "generation,manifest_hash") return "CHECKPOINT_INVALID";
  if (!validUint64(v.input.generation) || !validHash(v.input.manifest_hash)) return "CHECKPOINT_INVALID";
  if (!v.manifest.exists) return "CHECKPOINT_INVALID";
  if (v.manifest.hash !== v.input.manifest_hash) return "CHECKPOINT_INVALID";
  if (v.manifest.generation !== v.input.generation) return "CHECKPOINT_INVALID";
  if (!v.manifest.inventory_valid || !v.manifest.segments_valid) return "CHECKPOINT_INVALID";
  return "CHECKPOINT_VALID";
}

function cursorResult(v) {
  const keys = Object.keys(v.input).sort();
  if (keys.join(",") !== "checkpoint_hash,generation,position") return "CURSOR_INVALID";
  if (!validUint64(v.input.generation) || !validUint64(v.input.position) || !validHash(v.input.checkpoint_hash)) return "CURSOR_INVALID";
  if (v.input.checkpoint_hash !== v.checkpoint.hash) return "CURSOR_INVALID";
  if (BigInt(v.input.generation) > BigInt(v.checkpoint.generation)) return "CURSOR_INVALID";
  return "CURSOR_VALID";
}

function recoveryResult(v) {
  if (!v.manifest.exists || !v.manifest.inventory_valid || !v.manifest.segments_valid) return "RECOVERY_FAIL_CLOSED";
  if (v.checkpoint.input.manifest_hash !== v.manifest.hash) return "RECOVERY_FAIL_CLOSED";
  if (v.checkpoint.input.generation !== v.manifest.generation) return "RECOVERY_FAIL_CLOSED";
  if (v.cursor.input.checkpoint_hash !== v.checkpoint.hash) return "RECOVERY_FAIL_CLOSED";
  if (BigInt(v.cursor.input.generation) > BigInt(v.checkpoint.input.generation)) return "RECOVERY_FAIL_CLOSED";
  if (!v.acquisition_position_valid) return "RECOVERY_FAIL_CLOSED";
  return "RECOVERY_RESUME_ALLOWED";
}

test("checkpoint/cursor/recovery vectors are deterministic", () => {
  assert.equal(vectors.protocol, "HAHAWEEK-V4-CHECKPOINT-CURSOR-RECOVERY-V0.1");
  assert.equal(vectors.version, "0.1");
  assert.equal(vectors.vectors.length, 12);

  for (const vector of vectors.vectors) {
    const actual = vector.kind === "checkpoint"
      ? checkpointResult(vector)
      : vector.kind === "cursor"
        ? cursorResult(vector)
        : recoveryResult(vector);
    assert.equal(actual, vector.expected, vector.id);
  }
});

test("valid checkpoint hash uses the frozen V4 checkpoint domain and canonical input", () => {
  const vector = vectors.vectors.find((v) => v.id === "checkpoint-genesis-valid");
  const result = domainSeparatedHash(vectors.checkpoint_domain, vector.input);
  assert.equal(result.hash, vector.expected_hash);
});

test("valid cursor hash uses the frozen V4 cursor domain and canonical input", () => {
  const vector = vectors.vectors.find((v) => v.id === "cursor-genesis-valid");
  const result = domainSeparatedHash(vectors.cursor_domain, vector.input);
  assert.equal(result.hash, vector.expected_hash);
});

test("recovery is fail-closed when a referenced segment fails verification", () => {
  const vector = vectors.vectors.find((v) => v.id === "recovery-fail-closed-corrupt-segment");
  assert.equal(recoveryResult(vector), "RECOVERY_FAIL_CLOSED");
});

test("cursor never becomes authoritative over its checkpoint", () => {
  const vector = vectors.vectors.find((v) => v.id === "cursor-ahead-of-checkpoint");
  assert.equal(cursorResult(vector), "CURSOR_INVALID");
});
