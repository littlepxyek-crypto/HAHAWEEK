"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { domainSeparatedHash } = require("../src/reference/v4/hash");

const DEFAULT_FIXTURE = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "payload-event-identity.json"
);

const DOMAIN_PATTERN = /^HAHAWEEK-EVIDENCE-V4-[A-Z0-9-]+$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const HEX_PATTERN = /^(?:[0-9a-f]{2})*$/;

function fail(message) {
  throw new Error(message);
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
