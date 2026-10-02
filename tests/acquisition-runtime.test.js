"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createTargetPolicy } = require("../src/acquisition/target-policy");
const { createExecutionRequest, createLease, assertLease, createCheckpoint, executeAcquisition } = require("../src/acquisition/acquisition-runtime");

const policy = createTargetPolicy({ allowed_protocols: ["https:"], allowed_hosts: ["example.com"], timeout_ms: 1000 });

test("execution request rejects implicit backend escalation", () => {
  assert.throws(() => createExecutionRequest({
    request_id:"r1", source_id:"s1", source_type:"WEB", backend:"patchright", target:"https://example.com", policy
  }), /BACKEND_UNSUPPORTED/);
});

test("lease fails closed on ownership mismatch and expiry", () => {
  const lease = createLease("owner", "2026-10-02T00:00:00.000Z", 1000);
  assert.throws(() => assertLease(lease, "other", new Date("2026-10-02T00:00:00.100Z")), /LEASE_OWNERSHIP_INVALID/);
  assert.throws(() => assertLease(lease, "owner", new Date("2026-10-02T00:00:02.000Z")), /LEASE_EXPIRED/);
});

test("checkpoint is immutable and versioned", () => {
  const cp = createCheckpoint({request_id:"r1", execution_id:"e1", state:"CHECKPOINTED", sequence:3});
  assert.equal(cp.version, 1);
  assert.equal(Object.isFrozen(cp), true);
});

test("runtime preserves execution lifecycle and checkpoint", async () => {
  const result = await executeAcquisition({
    request_id:"r1", source_id:"s1", source_type:"WEB", backend:"http", target:"https://example.com", policy
  }, {
    acquire: async () => ({ content_type:"text/plain", content:"hello", provenance:{fixture:"test"} })
  }, { resolvedAddresses:["93.184.216.34"] });
  assert.equal(result.state, "RELEASED");
  assert.equal(result.result.status, "OBSERVED");
  assert.equal(result.checkpoints.at(-1).state, "VERIFIED");
  assert.equal(result.result.provenance.runtime.version, 1);
});

test("target policy failure never invokes backend", async () => {
  let invoked = false;
  const denied = createTargetPolicy({ allowed_protocols:["https:"], allowed_hosts:["other.example"] });
  await assert.rejects(() => executeAcquisition({
    request_id:"r2", source_id:"s1", source_type:"WEB", backend:"http", target:"https://example.com", policy:denied
  }, { acquire: async () => { invoked = true; } }, { resolvedAddresses:["93.184.216.34"] }), /TARGET_HOST_FORBIDDEN/);
  assert.equal(invoked, false);
});

test("backend failure is execution failure and produces checkpoint", async () => {
  await assert.rejects(() => executeAcquisition({
    request_id:"r3", source_id:"s1", source_type:"WEB", backend:"http", target:"https://example.com", policy
  }, { acquire: async () => { throw new Error("BACKEND_TIMEOUT"); } }, { resolvedAddresses:["93.184.216.34"] }), /BACKEND_TIMEOUT/);
});

test("execution telemetry cannot replace domain evidence", async () => {
  const result = await executeAcquisition({
    request_id:"r4", source_id:"s1", source_type:"WEB", backend:"http", target:"https://example.com", policy
  }, { acquire: async () => ({ content_type:"text/plain", content:"evidence" }) }, { resolvedAddresses:["93.184.216.34"] });
  assert.equal(result.result.content_hash.length, 64);
  assert.equal(result.result.provenance.runtime.version, 1);
  assert.equal(result.result.provenance.runtime.execution_id, result.execution_id);
});
