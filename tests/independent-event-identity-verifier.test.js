"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { verify } = require("../scripts/verify-v4-event-identity-independent");

const fixture = path.join(
  __dirname, "..", "docs", "golden-vectors", "event-identity.json"
);

test("independent V4 event-identity verifier validates canonical vector", () => {
  assert.equal(verify(fixture), 1);
});
