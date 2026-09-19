"use strict";

const { domainSeparatedHash } = require("./hash");
const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const UINT64_MAX = 18446744073709551615n;
const HASH32_RE = /^0x[0-9a-f]{64}$/;
function invalid(message) { throw new TypeError(message); }
function assertUint64(value, field) {
  if (typeof value !== "string" || !UINT64_RE.test(value)) invalid(field + " must be canonical uint64 decimal");
  if (BigInt(value) > UINT64_MAX) invalid(field + " exceeds uint64 range");
}
function assertHash(value, field) {
  if (typeof value !== "string" || !HASH32_RE.test(value)) invalid(field + " must be canonical lowercase 0x-prefixed 32-byte hash");
}
function exactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(label + " must be an object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) invalid(label + " has non-canonical key set");
}
function verifyCheckpoint(checkpoint, manifest) {
  exactKeys(checkpoint, ["generation", "manifest_hash"], "checkpoint");
  if (typeof checkpoint.generation !== "string" || typeof checkpoint.manifest_hash !== "string") invalid("checkpoint values must be strings");
  assertUint64(checkpoint.generation, "checkpoint.generation");
  assertHash(checkpoint.manifest_hash, "checkpoint.manifest_hash");
  if (!manifest || manifest.exists !== true) invalid("manifest is missing");
  if (manifest.hash !== checkpoint.manifest_hash) invalid("checkpoint/manifest hash mismatch");
  if (manifest.generation !== checkpoint.generation) invalid("checkpoint/manifest generation mismatch");
  if (manifest.inventory_valid !== true || manifest.segments_valid !== true) invalid("manifest inventory or segments are not verified");
  const digest = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-CHECKPOINT", checkpoint).hash;
  return { hash: "0x" + digest, generation: checkpoint.generation };
}
function verifyCursor(cursor, checkpoint) {
  exactKeys(cursor, ["generation", "checkpoint_hash", "position"], "cursor");
  for (const key of ["generation", "checkpoint_hash", "position"]) if (typeof cursor[key] !== "string") invalid("cursor." + key + " must be a string");
  assertUint64(cursor.generation, "cursor.generation");
  assertUint64(cursor.position, "cursor.position");
  assertHash(cursor.checkpoint_hash, "cursor.checkpoint_hash");
  if (cursor.checkpoint_hash !== checkpoint.hash) invalid("cursor/checkpoint hash mismatch");
  if (BigInt(cursor.generation) > BigInt(checkpoint.generation)) invalid("cursor generation exceeds checkpoint generation");
  const digest = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-CURSOR", cursor).hash;
  return { hash: "0x" + digest, generation: cursor.generation, position: cursor.position };
}
function verifyRecovery(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) invalid("recovery input must be an object");
  exactKeys(input, ["manifest", "checkpoint", "cursor", "acquisition_position_valid"], "recovery input");
  if (input.acquisition_position_valid !== true) invalid("acquisition position is not verified");
  const checkpoint = verifyCheckpoint(input.checkpoint, input.manifest);
  const cursor = verifyCursor(input.cursor, checkpoint);
  return { status: "RECOVERY_RESUME_ALLOWED", checkpoint, cursor };
}
module.exports = { verifyCheckpoint, verifyCursor, verifyRecovery };