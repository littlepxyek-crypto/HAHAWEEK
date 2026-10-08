"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { canonicalize, canonicalUtf8 } = require("../src/reference/v4/jcs");

const fixturePath = path.join(
  __dirname,
  "..",
  "docs",
  "golden-vectors",
  "jcs-rfc8785.json",
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("RFC 8785 JCS golden vectors", () => {
  assert.equal(fixture.schema, "hahaweek-v4-jcs-rfc8785-golden-vectors-v1");
  assert.match(fixture.source, /^RFC 8785,/);
  assert.ok(Array.isArray(fixture.vectors));
  assert.ok(fixture.vectors.length >= 10);

  for (const vector of fixture.vectors) {
    assert.equal(typeof vector.id, "string");
    assert.equal(typeof vector.input_json, "string");
    assert.equal(typeof vector.expected_canonical, "string");

    const input = JSON.parse(vector.input_json);
    const actual = canonicalize(input);

    assert.equal(
      actual,
      vector.expected_canonical,
      `canonical output mismatch: ${vector.id}`,
    );

    assert.equal(
      canonicalUtf8(input).toString("utf8"),
      vector.expected_canonical,
      `UTF-8 output mismatch: ${vector.id}`,
    );
  }
});

test("RFC 8785 recursive property sorting", () => {
  const input = JSON.parse(
    '{"b":1,"a":{"z":2,"a":3},"arr":[{"d":4,"c":5}]}',
  );

  assert.equal(
    canonicalize(input),
    '{"a":{"a":3,"z":2},"arr":[{"c":5,"d":4}],"b":1}',
  );
});
