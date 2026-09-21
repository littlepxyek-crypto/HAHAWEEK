"use strict";

const fs = require("node:fs");
const path = require("node:path");

const HASH = /^0x[0-9a-f]{64}$/;
const UINT64 = /^(0|[1-9][0-9]*)$/;

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function uint64(v) { return typeof v === "string" && UINT64.test(v) && BigInt(v) <= 18446744073709551615n; }
function hash(v) { return typeof v === "string" && HASH.test(v); }
function exactKeys(obj, keys, code) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) fail(code);
  const actual = Object.keys(obj).sort().join(",");
  if (actual !== [...keys].sort().join(",")) fail(code);
}
function verifyCheckpoint(v) {
  exactKeys(v.input, ["generation","manifest_hash"], "CHECKPOINT_INPUT_KEYS_INVALID");
  if (!uint64(v.input.generation) || !hash(v.input.manifest_hash)) fail("CHECKPOINT_INPUT_INVALID");
  if (!v.manifest || v.manifest.exists !== true) fail("CHECKPOINT_MANIFEST_MISSING");
  if (v.manifest.hash !== v.input.manifest_hash || v.manifest.generation !== v.input.generation ||
      v.manifest.inventory_valid !== true || v.manifest.segments_valid !== true) fail("CHECKPOINT_AUTHORITY_INVALID");
  return true;
}
function verifyCursor(v) {
  exactKeys(v.input, ["checkpoint_hash","generation","position"], "CURSOR_INPUT_KEYS_INVALID");
  if (!uint64(v.input.generation) || !uint64(v.input.position) || !hash(v.input.checkpoint_hash)) fail("CURSOR_INPUT_INVALID");
  if (!v.checkpoint || !hash(v.checkpoint.hash) || v.input.checkpoint_hash !== v.checkpoint.hash) fail("CURSOR_CHECKPOINT_MISMATCH");
  if (!uint64(v.checkpoint.generation) || BigInt(v.input.generation) > BigInt(v.checkpoint.generation)) fail("CURSOR_GENERATION_INVALID");
  return true;
}
function verifyRecovery(v) {
  verifyCheckpoint(v.checkpoint);
  verifyCursor(v.cursor);
  if (v.acquisition_position_valid !== true) fail("RECOVERY_ACQUISITION_POSITION_INVALID");
  return true;
}
function verifyVector(v) {
  if (!v || typeof v !== "object") fail("VECTOR_INVALID");
  if (typeof v.id !== "string" || typeof v.kind !== "string") fail("VECTOR_ID_OR_KIND_INVALID");
  if (v.kind === "checkpoint") { verifyCheckpoint(v); return "CHECKPOINT_VALID"; }
  if (v.kind === "cursor") { verifyCursor(v); return "CURSOR_VALID"; }
  if (v.kind === "recovery") { verifyRecovery(v); return "RECOVERY_RESUME_ALLOWED"; }
  fail("VECTOR_KIND_INVALID");
}
function verifyRecoveryFixture(filePath) {
  const fixture = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (fixture.protocol !== "HAHAWEEK-V4-CHECKPOINT-CURSOR-RECOVERY-V0.1") fail("PROTOCOL_INVALID");
  if (fixture.version !== "0.1") fail("VERSION_INVALID");
  if (!Array.isArray(fixture.vectors) || fixture.vectors.length === 0) fail("VECTORS_INVALID");
  const results = [];
  for (const vector of fixture.vectors) {
    let actual;
    try { actual = verifyVector(vector); }
    catch (error) { actual = error.code || error.message; }
    results.push({ id: vector.id, expected: vector.expected, actual, pass: actual === vector.expected });
  }
  if (results.some(r => !r.pass)) fail("OFFLINE_VECTOR_MISMATCH");
  return { count: results.length, results };
}

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, "..", "docs", "golden-vectors", "checkpoint-cursor-recovery.json");
  const result = verifyRecoveryFixture(file);
  process.stdout.write("offline V4 verification passed: " + result.count + " vectors\n");
}

module.exports = { verifyRecoveryFixture, verifyCheckpoint, verifyCursor, verifyRecovery };
