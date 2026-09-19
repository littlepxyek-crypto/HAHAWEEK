"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vectors = require("../docs/golden-vectors/source-independence.json");

function evaluateSourceIndependence(vector) {
  const qualifying = vector.evidence.filter((item) =>
    item.independence_class === "I3" || item.independence_class === "I4"
  );

  const lineageSet = new Set(qualifying.map((item) => item.lineage));
  const independentLineageCount = lineageSet.size;

  const l4Eligible =
    independentLineageCount >= 2 &&
    vector.contradiction !== true;

  return {
    independent_lineage_count: independentLineageCount,
    l4_eligible: l4Eligible,
  };
}

test("source independence golden vectors are deterministic", () => {
  assert.equal(vectors.protocol, "HAHAWEEK-SOURCE-INDEPENDENCE-V0.1");
  assert.equal(vectors.version, "0.1");
  assert.equal(vectors.vectors.length, 14);

  for (const vector of vectors.vectors) {
    const actual = evaluateSourceIndependence(vector);
    assert.deepEqual(
      actual,
      vector.expected,
      vector.id + ": " + vector.description
    );
  }
});

test("I0, I1, and I2 never count as independent lineages", () => {
  const vector = {
    evidence: [
      { lineage: "same", independence_class: "I0" },
      { lineage: "same", independence_class: "I1" },
      { lineage: "other", independence_class: "I2" },
    ],
  };

  assert.deepEqual(evaluateSourceIndependence(vector), {
    independent_lineage_count: 0,
    l4_eligible: false,
  });
});

test("duplicate acquisitions of one I3 lineage do not create L4", () => {
  const vector = {
    evidence: [
      { lineage: "one", independence_class: "I3" },
      { lineage: "one", independence_class: "I3" },
      { lineage: "one", independence_class: "I4" },
    ],
  };

  assert.deepEqual(evaluateSourceIndependence(vector), {
    independent_lineage_count: 1,
    l4_eligible: false,
  });
});

test("contradiction blocks L4 even with two independent lineages", () => {
  const vector = {
    evidence: [
      { lineage: "one", independence_class: "I3" },
      { lineage: "two", independence_class: "I4" },
    ],
    contradiction: true,
  };

  assert.deepEqual(evaluateSourceIndependence(vector), {
    independent_lineage_count: 2,
    l4_eligible: false,
  });
});
