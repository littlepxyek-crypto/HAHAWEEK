"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { verifyVectorSet } = require("./verify-golden-vectors");

const V4_FORMAT = "HAHAWEEK-EVIDENCE-V4-GOLDEN-VECTORS-1";
const V4_PROTOCOL = "HAHAWEEK-EVIDENCE-V4";
const V4_CANONICALIZATION = "RFC8785-JCS-UTF8-SHA256-DOMAIN-SEPARATOR";

const V4_GOLDEN_VECTOR_FIXTURES = Object.freeze([
  "docs/golden-vectors/event-identity.json",
  "docs/golden-vectors/payload-event-identity.json",
  "docs/golden-vectors/transition.json",
]);

const KNOWN_OUT_OF_SCOPE_FIXTURES = Object.freeze([
  "docs/golden-vectors/checkpoint-cursor-recovery.json",
  "docs/golden-vectors/cross-spec-l4-validation.json",
  "docs/golden-vectors/evidence-graph.json",
  "docs/golden-vectors/evidence-identity.json",
  "docs/golden-vectors/source-independence.json",
  "docs/golden-vectors/f02-reorg-scenario.json",
]);

const GOLDEN_VECTOR_DIR = path.join("docs", "golden-vectors");

function fail(message) {
  throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function assertInventory(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) fail("inventory must be non-empty");
  if (!unique(inventory)) fail("duplicate inventory entry");
  const sorted = [...inventory].sort();
  if (JSON.stringify(inventory) !== JSON.stringify(sorted)) {
    fail("inventory must be deterministically sorted");
  }
}

function classifyCommittedFixtures(repoRoot) {
  const directory = path.join(repoRoot, GOLDEN_VECTOR_DIR);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail("golden-vector directory is missing");
  }

  const names = fs.readdirSync(directory).filter((name) => name.endsWith(".json")).sort();
  const knownOutOfScope = new Set(
    KNOWN_OUT_OF_SCOPE_FIXTURES.map((fixture) => path.posix.basename(fixture)),
  );
  const discoveredV4 = [];

  for (const name of names) {
    const relative = path.posix.join(GOLDEN_VECTOR_DIR, name);

    if (knownOutOfScope.has(name)) continue;

    const filePath = path.join(repoRoot, relative);
    let document;
    try {
      document = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      fail(`unreadable or malformed fixture: ${relative}`);
    }

    if (
      document &&
      document.format === V4_FORMAT &&
      document.protocol === V4_PROTOCOL &&
      document.canonicalization === V4_CANONICALIZATION
    ) {
      discoveredV4.push(relative);
      continue;
    }

    fail(`unsupported or unexpected golden-vector fixture: ${relative}`);
  }

  return discoveredV4;
}

function verifyCoverage(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(__dirname, ".."));
  const inventory = options.inventory || V4_GOLDEN_VECTOR_FIXTURES;

  assertInventory(inventory);

  const discoveredV4 = classifyCommittedFixtures(repoRoot);
  const expected = [...inventory].sort();
  const discovered = [...discoveredV4].sort();

  if (JSON.stringify(discovered) !== JSON.stringify(expected)) {
    fail(
      `V4 fixture inventory mismatch: expected [${expected.join(", ")}], discovered [${discovered.join(", ")}]`,
    );
  }

  const results = inventory.map((relative) => {
    const absolute = path.join(repoRoot, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      fail(`missing V4 fixture: ${relative}`);
    }

    const result = verifyVectorSet(absolute);
    return {
      fixture: relative,
      vector_count: result.count,
      status: "VERIFIED",
    };
  });

  return {
    status: "VERIFIED",
    repository_root: repoRoot,
    fixture_count: results.length,
    vector_count: results.reduce((total, result) => total + result.vector_count, 0),
    fixtures: results,
  };
}

if (require.main === module) {
  const result = verifyCoverage();
  process.stdout.write(
    `verified ${result.fixture_count} V4 golden-vector fixtures / ${result.vector_count} vectors\\n`,
  );
  for (const fixture of result.fixtures) {
    process.stdout.write(`VERIFIED ${fixture.vector_count} ${fixture.fixture}\\n`);
  }
}

module.exports = {
  V4_GOLDEN_VECTOR_FIXTURES,
  KNOWN_OUT_OF_SCOPE_FIXTURES,
  verifyCoverage,
  classifyCommittedFixtures,
};
