"use strict";

const crypto = require("node:crypto");

const PROTOCOL = "HAHAWEEK-V4-CHECKPOINT-CURSOR-RECOVERY-V0.1";
const VERSION = "0.1";
const CHECKPOINT_DOMAIN = "HAHAWEEK-EVIDENCE-V4-CHECKPOINT";
const CURSOR_DOMAIN = "HAHAWEEK-EVIDENCE-V4-CURSOR";
const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const UINT64_MAX = 18446744073709551615n;
const HASH32_RE = /^0x[0-9a-f]{64}$/;

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
          if (!(next >= 0xdc00 && next <= 0xdfff)) {
            throw new TypeError(`Invalid lone high surrogate at ${path}`);
          }
          i += 1;
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          throw new TypeError(`Invalid lone low surrogate at ${path}`);
        }
      }
    }
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite number at ${path}`);
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

  throw new TypeError(`Unsupported JSON value at ${path}`);
}

function canonicalize(value) {
  assertJsonValue(value);

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

function canonicalUtf8(value) {
  return Buffer.from(canonicalize(value), "utf8");
}

function domainSeparatedHash(domain, value) {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new TypeError("domain must be a non-empty string");
  }
  const canonical = canonicalUtf8(value);
  const preimage = Buffer.concat([Buffer.from(domain, "utf8"), Buffer.from([0x00]), canonical]);
  return {
    canonicalUtf8Hex: canonical.toString("hex"),
    hash: crypto.createHash("sha256").update(preimage).digest("hex"),
  };
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function validUint64(value) {
  return typeof value === "string" && UINT64_RE.test(value) && BigInt(value) <= UINT64_MAX;
}

function validHash(value) {
  return typeof value === "string" && HASH32_RE.test(value);
}

function checkpointResult(vector) {
  if (!exactKeys(vector.input, ["generation", "manifest_hash"])) return "CHECKPOINT_INVALID";
  if (!validUint64(vector.input.generation) || !validHash(vector.input.manifest_hash)) return "CHECKPOINT_INVALID";
  if (!isPlainObject(vector.manifest) || !vector.manifest.exists) return "CHECKPOINT_INVALID";
  if (vector.manifest.hash !== vector.input.manifest_hash) return "CHECKPOINT_INVALID";
  if (vector.manifest.generation !== vector.input.generation) return "CHECKPOINT_INVALID";
  if (!vector.manifest.inventory_valid || !vector.manifest.segments_valid) return "CHECKPOINT_INVALID";
  return "CHECKPOINT_VALID";
}

function cursorResult(vector) {
  if (!exactKeys(vector.input, ["checkpoint_hash", "generation", "position"])) return "CURSOR_INVALID";
  if (!validUint64(vector.input.generation) || !validUint64(vector.input.position) || !validHash(vector.input.checkpoint_hash)) return "CURSOR_INVALID";
  if (!isPlainObject(vector.checkpoint) || vector.input.checkpoint_hash !== vector.checkpoint.hash) return "CURSOR_INVALID";
  if (!validHash(vector.checkpoint.hash) || !validUint64(vector.checkpoint.generation)) return "CURSOR_INVALID";
  if (BigInt(vector.input.generation) > BigInt(vector.checkpoint.generation)) return "CURSOR_INVALID";
  return "CURSOR_VALID";
}

function recoveryResult(vector) {
  if (!isPlainObject(vector.manifest) || !vector.manifest.exists || !vector.manifest.inventory_valid || !vector.manifest.segments_valid) {
    return "RECOVERY_FAIL_CLOSED";
  }
  if (!isPlainObject(vector.checkpoint) || !exactKeys(vector.checkpoint.input, ["generation", "manifest_hash"])) return "RECOVERY_FAIL_CLOSED";
  if (vector.checkpoint.input.manifest_hash !== vector.manifest.hash) return "RECOVERY_FAIL_CLOSED";
  if (vector.checkpoint.input.generation !== vector.manifest.generation) return "RECOVERY_FAIL_CLOSED";
  if (!isPlainObject(vector.cursor) || !exactKeys(vector.cursor.input, ["checkpoint_hash", "generation", "position"])) return "RECOVERY_FAIL_CLOSED";
  if (vector.cursor.input.checkpoint_hash !== vector.checkpoint.hash) return "RECOVERY_FAIL_CLOSED";
  if (!validUint64(vector.cursor.input.generation) || !validUint64(vector.checkpoint.input.generation)) return "RECOVERY_FAIL_CLOSED";
  if (BigInt(vector.cursor.input.generation) > BigInt(vector.checkpoint.input.generation)) return "RECOVERY_FAIL_CLOSED";
  if (vector.acquisition_position_valid !== true) return "RECOVERY_FAIL_CLOSED";
  return "RECOVERY_RESUME_ALLOWED";
}

function verifyVector(vector, domains) {
  if (!isPlainObject(vector) || typeof vector.id !== "string" || typeof vector.kind !== "string" || typeof vector.expected !== "string") {
    throw new TypeError("malformed vector");
  }

  let actual;
  if (vector.kind === "checkpoint") {
    if (!exactKeys(vector, ["id", "kind", "input", "manifest", "expected", "expected_hash"])) {
      if (!exactKeys(vector, ["id", "kind", "input", "manifest", "expected"])) throw new TypeError(`invalid keys for ${vector.id}`);
    }
    actual = checkpointResult(vector);
    if (Object.prototype.hasOwnProperty.call(vector, "expected_hash")) {
      const computed = domainSeparatedHash(domains.checkpoint, vector.input).hash;
      if (computed !== vector.expected_hash) throw new Error(`hash mismatch for ${vector.id}`);
    }
  } else if (vector.kind === "cursor") {
    if (!exactKeys(vector, ["id", "kind", "checkpoint", "input", "expected", "expected_hash"])) {
      if (!exactKeys(vector, ["id", "kind", "checkpoint", "input", "expected"])) throw new TypeError(`invalid keys for ${vector.id}`);
    }
    actual = cursorResult(vector);
    if (Object.prototype.hasOwnProperty.call(vector, "expected_hash")) {
      const computed = domainSeparatedHash(domains.cursor, vector.input).hash;
      if (computed !== vector.expected_hash) throw new Error(`hash mismatch for ${vector.id}`);
    }
  } else if (vector.kind === "recovery") {
    if (!exactKeys(vector, ["id", "kind", "manifest", "checkpoint", "cursor", "acquisition_position_valid", "expected"])) {
      throw new TypeError(`invalid keys for ${vector.id}`);
    }
    actual = recoveryResult(vector);
  } else {
    throw new TypeError(`unsupported vector kind for ${vector.id}`);
  }

  if (actual !== vector.expected) throw new Error(`expected result mismatch for ${vector.id}`);
  return { id: vector.id, kind: vector.kind, result: actual };
}

function verifyGoldenVectorDocument(document) {
  assertJsonValue(document);
  if (!exactKeys(document, ["protocol", "version", "checkpoint_domain", "cursor_domain", "vectors"])) {
    throw new TypeError("invalid golden-vector document keys");
  }
  if (document.protocol !== PROTOCOL || document.version !== VERSION) throw new Error("unsupported golden-vector protocol");
  if (document.checkpoint_domain !== CHECKPOINT_DOMAIN || document.cursor_domain !== CURSOR_DOMAIN) {
    throw new Error("invalid golden-vector domain");
  }
  if (!Array.isArray(document.vectors) || document.vectors.length === 0) throw new TypeError("vectors must be a non-empty array");

  const ids = new Set();
  const results = [];
  for (const vector of document.vectors) {
    if (ids.has(vector && vector.id)) throw new Error(`duplicate vector id: ${vector.id}`);
    ids.add(vector && vector.id);
    results.push(verifyVector(vector, {
      checkpoint: document.checkpoint_domain,
      cursor: document.cursor_domain,
    }));
  }

  return {
    verifier_version: "independent-golden-vector-verifier-v1",
    status: "VERIFIED",
    vector_count: results.length,
    results,
  };
}

module.exports = {
  canonicalize,
  canonicalUtf8,
  domainSeparatedHash,
  verifyGoldenVectorDocument,
};
