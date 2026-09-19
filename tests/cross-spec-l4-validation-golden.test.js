"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vectors = require("../docs/golden-vectors/cross-spec-l4-validation.json");

function evaluate(vector) {
  if (vector.requested_level === "L5" || vector.reorg_invalidated) return "L4_UNKNOWN";
  if (!vector.evidence.every((item) => item.valid === true)) return "L4_UNKNOWN";
  if (!vector.provenance_complete) return "L4_BLOCKED_PROVENANCE";
  if (!vector.falsifier_present) return "L4_UNKNOWN";
  if (vector.contradiction === true) return "L4_BLOCKED_CONTRADICTION";
  if (vector.temporal_compatible !== true) return "L4_BLOCKED_TEMPORAL";
  const relations = new Set(vector.evidence.map((item) => item.relation));
  if (relations.size !== 1) return "L4_BLOCKED_RELATION_MISMATCH";
  const qualifying = vector.evidence.filter((item) => item.independence_class === "I3" || item.independence_class === "I4");
  const lineages = new Set(qualifying.map((item) => item.lineage));
  return lineages.size >= 2 ? "L4_ELIGIBLE" : "L4_BLOCKED_INSUFFICIENT_INDEPENDENCE";
}

test("cross-spec L4 golden vectors are deterministic", () => {
  assert.equal(vectors.protocol, "HAHAWEEK-CROSS-SPEC-L4-VALIDATION-V0.1");
  assert.equal(vectors.version, "0.1");
  assert.equal(vectors.vectors.length, 17);
  for (const vector of vectors.vectors) {
    assert.equal(evaluate(vector), vector.expected, vector.id + ": " + vector.description);
  }
});

test("positive L4 requires two distinct I3/I4 lineages for the same relation", () => {
  const vector = {
    evidence: [
      { lineage: "a", independence_class: "I3", relation: "R", valid: true },
      { lineage: "b", independence_class: "I4", relation: "R", valid: true }
    ],
    temporal_compatible: true,
    contradiction: false,
    falsifier_present: true,
    provenance_complete: true,
    reorg_invalidated: false
  };
  assert.equal(evaluate(vector), "L4_ELIGIBLE");
});

test("two acquisitions of one underlying lineage cannot manufacture independence", () => {
  const vector = {
    evidence: [
      { lineage: "same-event", independence_class: "I3", relation: "R", valid: true },
      { lineage: "same-event", independence_class: "I3", relation: "R", valid: true }
    ],
    temporal_compatible: true,
    contradiction: false,
    falsifier_present: true,
    provenance_complete: true,
    reorg_invalidated: false
  };
  assert.equal(evaluate(vector), "L4_BLOCKED_INSUFFICIENT_INDEPENDENCE");
});
