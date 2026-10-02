"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  defineSource,
  transitionHealth,
} = require("../src/acquisition/source-registry");
const {
  createAcquisitionResult,
  hashContent,
} = require("../src/acquisition/acquisition-result");
const {
  createHealthRecord,
  nextHealth,
} = require("../src/acquisition/source-health");

test("acquisition result hashes observed content deterministically", () => {
  const result = createAcquisitionResult({
    acquisition_id: "acq:test:1",
    source_id: "source:test",
    source_type: "WEB",
    backend: "http",
    target: "https://example.test",
    started_at: "2026-10-02T00:00:00Z",
    completed_at: "2026-10-02T00:00:01Z",
    status: "OBSERVED",
    content_type: "text/plain",
    content: "hello",
    provenance: { backend_version: "test", network: "test" },
  });

  assert.equal(result.content_hash, hashContent("hello"));
  assert.equal(Object.isFrozen(result), true);
});

test("content hash mismatch fails closed", () => {
  assert.throws(() => createAcquisitionResult({
    acquisition_id: "acq:test:2",
    source_id: "source:test",
    source_type: "WEB",
    backend: "http",
    target: "https://example.test",
    started_at: "2026-10-02T00:00:00Z",
    completed_at: "2026-10-02T00:00:01Z",
    status: "OBSERVED",
    content_type: "text/plain",
    content: "hello",
    content_hash: "wrong",
  }), /CONTENT_HASH_MISMATCH/);
});

test("unavailable result cannot carry observed content", () => {
  assert.throws(() => createAcquisitionResult({
    acquisition_id: "acq:test:3",
    source_id: "source:test",
    source_type: "WEB",
    backend: "scrapling",
    target: "https://example.test",
    started_at: "2026-10-02T00:00:00Z",
    completed_at: "2026-10-02T00:00:01Z",
    status: "UNAVAILABLE",
    content: "should-not-exist",
  }), /NON_OBSERVED_CONTENT_FORBIDDEN/);
});

test("source declaration is acquisition-only", () => {
  const source = defineSource({
    source_id: "source:web:test",
    source_type: "WEB",
    backend: "scrapling",
    capabilities: ["FETCH", "EXTRACT"],
    enabled: true,
  });
  assert.equal(source.authority, "ACQUISITION_ONLY");
  assert.deepEqual(source.capabilities, ["FETCH", "EXTRACT"]);
});

test("health transitions preserve fail-closed semantics", () => {
  assert.equal(transitionHealth("UNKNOWN", "PROBING"), "PROBING");
  assert.equal(transitionHealth("PROBING", "AVAILABLE"), "AVAILABLE");
  assert.equal(transitionHealth("AVAILABLE", "DEGRADED"), "DEGRADED");
  assert.equal(transitionHealth("DEGRADED", "FAILED"), "FAILED");
  assert.equal(transitionHealth("FAILED", "AVAILABLE"), "PROBING");
});

test("health records are immutable snapshots", () => {
  const record = createHealthRecord({
    source_id: "source:web:test",
    state: "AVAILABLE",
    checked_at: "2026-10-02T00:00:00Z",
    probe_id: "probe:1",
    backend: "http",
  });
  const next = nextHealth(record, "DEGRADED");
  assert.equal(record.state, "AVAILABLE");
  assert.equal(next.state, "DEGRADED");
});
