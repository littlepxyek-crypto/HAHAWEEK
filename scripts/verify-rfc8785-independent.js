"use strict";

const fs = require("node:fs");
const path = require("node:path");

const fixturePath = path.join(__dirname, "..", "docs", "golden-vectors", "jcs-rfc8785.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function canonicalizeIndependent(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Non-finite JSON number");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map(canonicalizeIndependent).join(",") + "]";
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalizeIndependent(value[key])
    ).join(",") + "}";
  }

  throw new TypeError("Unsupported JSON value");
}

if (!fixture || !Array.isArray(fixture.vectors)) {
  throw new Error("Invalid RFC 8785 fixture");
}

for (const vector of fixture.vectors) {
  const input = JSON.parse(vector.input_json);
  const actual = canonicalizeIndependent(input);
  if (actual !== vector.expected_canonical) {
    throw new Error(
      `RFC 8785 mismatch for ${vector.id}: expected ${vector.expected_canonical}, got ${actual}`
    );
  }
}

console.log(`RFC 8785 independent verification: PASS (${fixture.vectors.length} vectors)`);
