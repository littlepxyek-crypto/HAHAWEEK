"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_FIXTURE = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "payload-event-identity.json"
);

const DOMAIN_PATTERN = /^HAHAWEEK-EVIDENCE-V4-[A-Z0-9.-]+$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const HEX_PATTERN = /^(?:[0-9a-f]{2})*$/;

function fail(message) {
  throw new Error(message);
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

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const members = keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
  return `{${members.join(",")}}`;
}

function domainSeparatedHash(domain, value) {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new TypeError("domain must be a non-empty string");
  }

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

function verifyVectorSet(filePath = DEFAULT_FIXTURE) {
  const raw = fs.readFileSync(filePath, "utf8");
  const set = JSON.parse(raw);

  if (set.format !== "HAHAWEEK-EVIDENCE-V4-GOLDEN-VECTORS-1") fail("invalid format");
  if (set.protocol !== "HAHAWEEK-EVIDENCE-V4") fail("invalid protocol");
  if (set.canonicalization !== "RFC8785-JCS-UTF8-SHA256-DOMAIN-SEPARATOR") {
    fail("invalid canonicalization");
  }
  if (!Array.isArray(set.vectors) || set.vectors.length === 0) fail("vectors must be non-empty");

  const ids = new Set();

  for (const vector of set.vectors) {
    const keys = Object.keys(vector).sort();
    const expectedKeys = [
      "canonical_utf8_hex",
      "domain",
      "expected_hash",
      "input_object",
      "vector_id",
    ];

    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
      fail(`invalid vector keys: ${vector.vector_id ?? "<unknown>"}`);
    }
    if (typeof vector.vector_id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(vector.vector_id)) {
      fail("invalid vector_id");
    }
    if (ids.has(vector.vector_id)) fail(`duplicate vector_id: ${vector.vector_id}`);
    ids.add(vector.vector_id);

    if (typeof vector.domain !== "string" || !DOMAIN_PATTERN.test(vector.domain)) fail("invalid domain");
    if (!vector.input_object || typeof vector.input_object !== "object" || Array.isArray(vector.input_object)) {
      fail(`invalid input_object: ${vector.vector_id}`);
    }
    if (typeof vector.canonical_utf8_hex !== "string" || !HEX_PATTERN.test(vector.canonical_utf8_hex)) {
      fail(`invalid canonical_utf8_hex: ${vector.vector_id}`);
    }
    if (typeof vector.expected_hash !== "string" || !HASH_PATTERN.test(vector.expected_hash)) {
      fail(`invalid expected_hash: ${vector.vector_id}`);
    }

    const actual = domainSeparatedHash(vector.domain, vector.input_object);

    if (actual.canonicalUtf8Hex !== vector.canonical_utf8_hex) {
      fail(`canonical bytes mismatch: ${vector.vector_id}`);
    }
    if (actual.hash !== vector.expected_hash) {
      fail(`hash mismatch: ${vector.vector_id}`);
    }
  }

  return { filePath, count: set.vectors.length };
}

if (require.main === module) {
  const result = verifyVectorSet(process.argv[2] || DEFAULT_FIXTURE);
  process.stdout.write(`verified ${result.count} V4 golden vectors: ${result.filePath}\n`);
}

module.exports = { verifyVectorSet };
