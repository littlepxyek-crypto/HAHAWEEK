"use strict";

const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "tests/rfc8785-conformance-boundary.test.js"],
  { stdio: "inherit" }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
