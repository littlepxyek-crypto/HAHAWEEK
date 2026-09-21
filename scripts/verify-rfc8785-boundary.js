"use strict";

const { spawnSync } = require("node:child_process");

function run(label, args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });

  if (result.error) {
    console.error(label + ": " + result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("RFC8785 conformance boundary", [
  "--test",
  "--test-concurrency=1",
  "tests/rfc8785-conformance-boundary.test.js"
]);

run("RFC8785 golden fixture", [
  "scripts/verify-rfc8785-fixture.js"
]);
