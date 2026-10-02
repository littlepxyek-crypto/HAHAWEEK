"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { defineSource, transitionHealth } = require("../src/acquisition/source-registry");
const { createAcquisitionResult, hashContent } = require("../src/acquisition/acquisition-result");
const { createHealthRecord, nextHealth } = require("../src/acquisition/source-health");
const { createTargetPolicy, validateTarget } = require("../src/acquisition/target-policy");

function observedInput(overrides = {}) {
  return {
    acquisition_id: "acq:test:1", source_id: "source:test", source_type: "WEB",
    backend: "http", target: "https://example.test",
    started_at: "2026-10-02T00:00:00Z", completed_at: "2026-10-02T00:00:01Z",
    status: "OBSERVED", content_type: "text/plain", content: "hello", ...overrides,
  };
}

test("observed content gets deterministic SHA-256 content hash", () => {
  const result = createAcquisitionResult(observedInput({
    provenance: { backend: { name: "http", version: "1" } },
  }));
  assert.equal(result.content_hash, hashContent("hello"));
  assert.equal(Object.isFrozen(result.provenance.backend), true);
});

test("nested provenance is isolated and immutable", () => {
  const provenance = { backend: { name: "http" } };
  const result = createAcquisitionResult(observedInput({ provenance }));
  provenance.backend.name = "tampered";
  assert.equal(result.provenance.backend.name, "http");
  assert.throws(() => { result.provenance.backend.name = "tampered"; }, TypeError);
});

test("content hash mismatch fails closed", () => {
  assert.throws(() => createAcquisitionResult(observedInput({ content_hash: "wrong" })), /CONTENT_HASH_MISMATCH/);
});

test("non-observed states cannot carry content", () => {
  assert.throws(() => createAcquisitionResult({
    ...observedInput(), status: "UNAVAILABLE",
  }), /NON_OBSERVED_CONTENT_FORBIDDEN/);
});

test("source declaration is acquisition-only and rejects authority escalation", () => {
  const source = defineSource({
    source_id: "source:web:test", source_type: "WEB", backend: "scrapling",
    capabilities: ["FETCH", "EXTRACT"], enabled: true,
    rate_limit: { requests_per_minute: 10 }, authentication: { mode: "none" },
    provenance: { registry_version: "a8-test" },
  });
  assert.equal(source.authority, "ACQUISITION_ONLY");
  assert.throws(() => defineSource({
    source_id: "source:escalation", source_type: "WEB", backend: "http",
    authority: "EVIDENCE_AUTHORITY",
  }), /AUTHORITY_ESCALATION_FORBIDDEN/);
});

test("health FSM rejects invalid transitions", () => {
  assert.equal(transitionHealth("UNKNOWN", "PROBING"), "PROBING");
  assert.equal(transitionHealth("PROBING", "AVAILABLE"), "AVAILABLE");
  assert.equal(transitionHealth("PROBING", "DEGRADED"), "DEGRADED");
  assert.equal(transitionHealth("DEGRADED", "FAILED"), "FAILED");
  assert.equal(transitionHealth("FAILED", "PROBING"), "PROBING");
  assert.throws(() => transitionHealth("UNKNOWN", "AVAILABLE"), /HEALTH_TRANSITION_INVALID/);
  assert.throws(() => transitionHealth("AVAILABLE", "FAILED"), /HEALTH_TRANSITION_INVALID/);
  assert.throws(() => transitionHealth("FAILED", "AVAILABLE"), /HEALTH_TRANSITION_INVALID/);
});

test("health snapshots preserve history and nested immutability", () => {
  const record = createHealthRecord({
    source_id: "source:web:test", state: "AVAILABLE",
    provenance: { probe: { attempt: 1 } },
  });
  const next = nextHealth(record, "PROBING");
  assert.equal(record.state, "AVAILABLE");
  assert.equal(next.state, "PROBING");
  assert.equal(Object.isFrozen(record.provenance.probe), true);
});

test("target policy defaults to deny", () => {
  const policy = createTargetPolicy();
  assert.deepEqual(policy.allowed_protocols, []);
  assert.deepEqual(policy.allowed_hosts, []);
  assert.equal(policy.allow_private_network, false);
  assert.equal(policy.allow_localhost, false);
});

test("target policy requires explicit protocol and host", () => {
  const policy = createTargetPolicy({ allowed_protocols: ["https:"], allowed_hosts: ["example.com"] });
  assert.throws(() => validateTarget("http://example.com", policy, ["93.184.216.34"]), /TARGET_PROTOCOL_FORBIDDEN/);
  assert.throws(() => validateTarget("https://not-example.com", policy, ["93.184.216.34"]), /TARGET_HOST_FORBIDDEN/);
});

test("target policy rejects credentials and private/localhost targets", () => {
  const policy = createTargetPolicy({
    allowed_protocols: ["https:"],
    allowed_hosts: ["example.com", "127.0.0.1", "localhost"],
  });
  assert.throws(() => validateTarget("https://user:pass@example.com", policy, ["93.184.216.34"]), /TARGET_CREDENTIALS_FORBIDDEN/);
  assert.throws(() => validateTarget("https://127.0.0.1", policy, ["127.0.0.1"]), /TARGET_PRIVATE_NETWORK_FORBIDDEN/);
  assert.throws(() => validateTarget("https://localhost", policy, ["127.0.0.1"]), /TARGET_LOCALHOST_FORBIDDEN/);
});

test("target policy rejects DNS rebinding to private address", () => {
  const policy = createTargetPolicy({ allowed_protocols: ["https:"], allowed_hosts: ["example.com"] });
  assert.throws(() => validateTarget("https://example.com", policy, ["10.0.0.8"]), /TARGET_DNS_PRIVATE_NETWORK_FORBIDDEN/);
});

test("target policy requires DNS evidence before network use", () => {
  const policy = createTargetPolicy({ allowed_protocols: ["https:"], allowed_hosts: ["example.com"] });
  assert.throws(() => validateTarget("https://example.com", policy), /TARGET_DNS_RESOLUTION_REQUIRED/);
  assert.equal(validateTarget("https://example.com", policy, ["93.184.216.34"]).hostname, "example.com");
});

test("malformed target input fails closed", () => {
  const policy = createTargetPolicy({ allowed_protocols: ["https:"], allowed_hosts: ["example.com"] });
  assert.throws(() => validateTarget("not-a-url", policy, ["93.184.216.34"]), /TARGET_URL_INVALID/);
});
