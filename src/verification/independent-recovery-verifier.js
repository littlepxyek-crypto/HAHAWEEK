"use strict";

const crypto = require("node:crypto");

const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const UINT64_MAX = 18446744073709551615n;
const HASH32_RE = /^0x[0-9a-f]{64}$/;

function fail(message) {
  throw new TypeError(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertJsonValue(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    if (typeof value === "string") {
      for (let i = 0; i < value.length; i += 1) {
        const code = value.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = value.charCodeAt(i + 1);
          if (!(next >= 0xdc00 && next <= 0xdfff)) fail(`Invalid lone high surrogate at ${path}`);
          i += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          fail(`Invalid lone low surrogate at ${path}`);
        }
      }
    }
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`Non-finite number at ${path}`);
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) assertJsonValue(value[i], `${path}[${i}]`);
    return;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) assertJsonValue(value[key], `${path}.${key}`);
    return;
  }

  fail(`Unsupported JSON value at ${path}`);
}

function canonicalize(value) {
  assertJsonValue(value);

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

function domainSeparatedHash(domain, value) {
  if (typeof domain !== "string" || domain.length === 0) fail("domain must be a non-empty string");

  const canonical = Buffer.from(canonicalize(value), "utf8");
  const preimage = Buffer.concat([
    Buffer.from(domain, "utf8"),
    Buffer.from([0x00]),
    canonical,
  ]);

  return {
    canonicalUtf8Hex: canonical.toString("hex"),
    hash: crypto.createHash("sha256").update(preimage).digest("hex"),
  };
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} has non-canonical key set`);
  }
}

function assertUint64(value, field) {
  if (typeof value !== "string" || !UINT64_RE.test(value)) {
    fail(`${field} must be canonical uint64 decimal`);
  }
  if (BigInt(value) > UINT64_MAX) fail(`${field} exceeds uint64 range`);
}

function assertHash(value, field) {
  if (typeof value !== "string" || !HASH32_RE.test(value)) {
    fail(`${field} must be canonical lowercase 0x-prefixed 32-byte hash`);
  }
}

function verifyCheckpoint(checkpoint, manifest) {
  exactKeys(checkpoint, ["generation", "manifest_hash"], "checkpoint");
  assertUint64(checkpoint.generation, "checkpoint.generation");
  assertHash(checkpoint.manifest_hash, "checkpoint.manifest_hash");

  if (!isPlainObject(manifest) || manifest.exists !== true) fail("manifest is missing");
  if (manifest.hash !== checkpoint.manifest_hash) fail("checkpoint/manifest hash mismatch");
  if (manifest.generation !== checkpoint.generation) fail("checkpoint/manifest generation mismatch");
  if (manifest.inventory_valid !== true || manifest.segments_valid !== true) {
    fail("manifest inventory or segments are not verified");
  }

  const digest = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-CHECKPOINT", checkpoint).hash;
  return { hash: `0x${digest}`, generation: checkpoint.generation };
}

function verifyCheckpointRecord(record, manifest) {
  exactKeys(record, ["input", "hash"], "checkpoint record");
  assertHash(record.hash, "checkpoint.hash");

  const verified = verifyCheckpoint(record.input, manifest);
  if (record.hash !== verified.hash) fail("checkpoint digest mismatch");
  return verified;
}

function verifyCursor(cursor, checkpoint) {
  exactKeys(cursor, ["generation", "checkpoint_hash", "position"], "cursor");
  assertUint64(cursor.generation, "cursor.generation");
  assertHash(cursor.checkpoint_hash, "cursor.checkpoint_hash");
  assertUint64(cursor.position, "cursor.position");

  if (!isPlainObject(checkpoint)) fail("checkpoint must be a verified object");
  assertHash(checkpoint.hash, "checkpoint.hash");
  assertUint64(checkpoint.generation, "checkpoint.generation");

  if (cursor.checkpoint_hash !== checkpoint.hash) fail("cursor/checkpoint hash mismatch");
  if (BigInt(cursor.generation) > BigInt(checkpoint.generation)) {
    fail("cursor generation exceeds checkpoint generation");
  }

  const digest = domainSeparatedHash("HAHAWEEK-EVIDENCE-V4-CURSOR", cursor).hash;
  return {
    hash: `0x${digest}`,
    generation: cursor.generation,
    position: cursor.position,
  };
}

function verifyCursorRecord(record, checkpoint) {
  exactKeys(record, ["input", "hash"], "cursor record");
  assertHash(record.hash, "cursor.hash");

  const verified = verifyCursor(record.input, checkpoint);
  if (record.hash !== verified.hash) fail("cursor digest mismatch");
  return verified;
}

function verifyRecovery(input) {
  exactKeys(input, ["manifest", "checkpoint", "cursor", "acquisition_position_valid"], "recovery input");
  if (input.acquisition_position_valid !== true) fail("acquisition position is not verified");

  const checkpoint = verifyCheckpointRecord(input.checkpoint, input.manifest);
  const cursor = verifyCursorRecord(input.cursor, checkpoint);

  return { status: "RECOVERY_RESUME_ALLOWED", checkpoint, cursor };
}

module.exports = {
  canonicalize,
  domainSeparatedHash,
  verifyCheckpoint,
  verifyCheckpointRecord,
  verifyCursor,
  verifyCursorRecord,
  verifyRecovery,
};
