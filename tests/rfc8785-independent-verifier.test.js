"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("independent RFC 8785 verifier passes all golden vectors", () => {
  const script = path.join(__dirname, "..", "scripts", "verify-rfc8785-independent.js");
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RFC 8785 independent verification: PASS/);
});
