"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalUtf8 } = require("../src/reference/v4/jcs");

const fixturePath = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "rfc8785-conformance.json"
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function fail(message) {
  throw new Error("RFC8785_FIXTURE_VERIFY_FAILED: " + message);
}

if (fixture.status !== "REFERENCE_ONLY_PENDING_EXECUTION") {
  fail("fixture status changed unexpectedly");
}

for (const vector of fixture.positive_vectors) {
  const actual = canonicalUtf8(vector.input_object).toString("hex");
  if (actual !== vector.expected_canonical_utf8_hex) {
    fail(
      vector.vector_id +
        ": expected " +
        vector.expected_canonical_utf8_hex +
        ", got " +
        actual
    );
  }
}

for (const vector of fixture.negative_vectors) {
  let rejected = false;

  try {
    if (vector.vector_id === "rfc8785-negative-nonfinite-001") {
      canonicalUtf8(NaN);
    } else if (vector.vector_id === "rfc8785-negative-surrogate-001") {
      canonicalUtf8("\ud800");
    } else {
      fail(vector.vector_id + ": unsupported negative vector");
    }
  } catch (error) {
    rejected = true;
  }

  if (!rejected) {
    fail(vector.vector_id + ": invalid input was accepted");
  }
}

console.log("RFC 8785 fixture verification: PASS");
