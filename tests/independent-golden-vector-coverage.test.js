"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const coverage = require("../scripts/verify-golden-vector-coverage");

test("STEP 484 inventory covers the complete committed V4 fixture corpus", () => {
  assert.deepEqual(coverage.V4_GOLDEN_VECTOR_FIXTURES, [
    "docs/golden-vectors/event-identity.json",
    "docs/golden-vectors/payload-event-identity.json",
    "docs/golden-vectors/transition.json",
    "docs/golden-vectors/v4-evidence-commitment.json",
  ]);

  assert.deepEqual(
    coverage.classifyCommittedFixtures(path.join(__dirname, "..")),
    coverage.V4_GOLDEN_VECTOR_FIXTURES,
  );
});

test("STEP 484 verifies every committed V4 fixture exactly once", () => {
  const result = coverage.verifyCoverage({ repoRoot: path.join(__dirname, "..") });

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.fixture_count, 4);
  assert.equal(result.vector_count, 10);
  assert.deepEqual(
    result.fixtures.map((fixture) => fixture.fixture),
    coverage.V4_GOLDEN_VECTOR_FIXTURES,
  );
  assert.deepEqual(
    result.fixtures.map((fixture) => fixture.status),
    ["VERIFIED", "VERIFIED", "VERIFIED", "VERIFIED"],
  );
});

test("STEP 484 fails closed on duplicate inventory entries", () => {
  const duplicate = [
    ...coverage.V4_GOLDEN_VECTOR_FIXTURES,
    coverage.V4_GOLDEN_VECTOR_FIXTURES[0],
  ].sort();

  assert.throws(
    () => coverage.verifyCoverage({ repoRoot: path.join(__dirname, ".."), inventory: duplicate }),
    /duplicate inventory entry/,
  );
});

test("STEP 484 fails closed when an inventory fixture is missing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hahaweek-step-484-"));
  try {
    fs.mkdirSync(path.join(tempRoot, "docs", "golden-vectors"), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, "docs", "golden-vectors", "event-identity.json"),
      fs.readFileSync(
        path.join(__dirname, "..", "docs", "golden-vectors", "event-identity.json"),
        "utf8",
      ),
    );

    assert.throws(
      () => coverage.verifyCoverage({ repoRoot: tempRoot }),
      /unsupported or unexpected golden-vector fixture|V4 fixture inventory mismatch/,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("STEP 484 fails closed on an unexpected JSON fixture", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hahaweek-step-484-"));
  try {
    fs.mkdirSync(path.join(tempRoot, "docs", "golden-vectors"), { recursive: true });
    for (const relative of [
      ...coverage.V4_GOLDEN_VECTOR_FIXTURES,
      ...coverage.KNOWN_OUT_OF_SCOPE_FIXTURES,
    ]) {
      const source = path.join(__dirname, "..", relative);
      const destination = path.join(tempRoot, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }

    fs.writeFileSync(
      path.join(tempRoot, "docs", "golden-vectors", "unexpected.json"),
      "{}",
    );

    assert.throws(
      () => coverage.verifyCoverage({ repoRoot: tempRoot }),
      /unsupported or unexpected golden-vector fixture/,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
