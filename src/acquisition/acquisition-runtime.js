"use strict";

const crypto = require("node:crypto");
const { createAcquisitionResult } = require("./acquisition-result");
const { validateTarget } = require("./target-policy");

const STATES = Object.freeze([
  "REQUESTED","VALIDATING","LEASED","EXECUTING","CAPTURED","VERIFIED",
  "CHECKPOINTED","RELEASED","VALIDATION_FAILED","LEASE_FAILED",
  "EXECUTION_FAILED","VERIFICATION_FAILED","CANCELLED","LEASE_LOST"
]);

function freeze(value) {
  return Object.freeze(value);
}

function executionId(requestId, backend, target) {
  return crypto.createHash("sha256")
    .update(JSON.stringify({ request_id: requestId, backend, target }))
    .digest("hex");
}

function createExecutionRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("REQUEST_REQUIRED");
  for (const key of ["request_id","source_id","source_type","backend","target"]) {
    if (typeof input[key] !== "string" || !input[key]) throw new TypeError(key.toUpperCase()+"_REQUIRED");
  }
  if (input.backend !== "http") throw new Error("BACKEND_UNSUPPORTED");
  return freeze({
    request_id: input.request_id,
    source_id: input.source_id,
    source_type: input.source_type,
    backend: input.backend,
    target: input.target,
    content_type_hint: input.content_type_hint || null,
    policy: input.policy,
  });
}

function createLease(owner, now = new Date().toISOString(), ttlMs = 30000) {
  if (typeof owner !== "string" || !owner) throw new TypeError("LEASE_OWNER_REQUIRED");
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new TypeError("LEASE_TTL_INVALID");
  return freeze({ lease_id: crypto.randomUUID(), owner, acquired_at: now, expires_at: new Date(Date.parse(now)+ttlMs).toISOString() });
}

function assertLease(lease, owner, now = new Date()) {
  if (!lease || lease.owner !== owner) throw new Error("LEASE_OWNERSHIP_INVALID");
  if (Date.parse(lease.expires_at) <= now.getTime()) throw new Error("LEASE_EXPIRED");
}

function createCheckpoint(input) {
  if (!input || typeof input !== "object") throw new TypeError("CHECKPOINT_REQUIRED");
  for (const key of ["request_id","execution_id","state","sequence"]) {
    if (input[key] === undefined || input[key] === null) throw new TypeError("CHECKPOINT_"+key.toUpperCase()+"_REQUIRED");
  }
  if (!STATES.includes(input.state)) throw new TypeError("CHECKPOINT_STATE_UNSUPPORTED");
  if (!Number.isInteger(input.sequence) || input.sequence < 0) throw new TypeError("CHECKPOINT_SEQUENCE_INVALID");
  return freeze({
    version: 1,
    request_id: input.request_id,
    execution_id: input.execution_id,
    state: input.state,
    sequence: input.sequence,
    updated_at: input.updated_at || new Date().toISOString(),
    acquisition_id: input.acquisition_id || null,
    content_hash: input.content_hash || null,
  });
}

async function executeAcquisition(input, backend, options = {}) {
  const request = createExecutionRequest(input);
  const owner = options.owner || "a9-runtime";
  const now = options.now || (() => new Date());
  let state = "REQUESTED";
  const events = [];
  const checkpoints = [];
  const emit = (next, data = {}) => {
    state = next;
    events.push(freeze({ sequence: events.length, state: next, at: now().toISOString(), ...data }));
  };
  const checkpoint = (data = {}) => {
    const cp = createCheckpoint({
      request_id: request.request_id,
      execution_id: executionId(request.request_id, request.backend, request.target),
      state,
      sequence: events.length,
      updated_at: now().toISOString(),
      ...data,
    });
    checkpoints.push(cp);
    return cp;
  };

  try {
    emit("VALIDATING");
    const target = validateTarget(request.target, request.policy, options.resolvedAddresses || []);
    const lease = createLease(owner, now().toISOString(), options.leaseTtlMs || 30000);
    assertLease(lease, owner, now());
    emit("LEASED", { lease_id: lease.lease_id });
    assertLease(lease, owner, now());
    emit("EXECUTING", { backend: request.backend });

    if (!backend || typeof backend.acquire !== "function") throw new Error("BACKEND_INVALID");
    const captured = await backend.acquire({
      request,
      target,
      assertLease: () => assertLease(lease, owner, now()),
    });

    assertLease(lease, owner, now());
    emit("CAPTURED");
    const result = createAcquisitionResult({
      acquisition_id: captured.acquisition_id || "acq:" + executionId(request.request_id, request.backend, request.target),
      source_id: request.source_id,
      source_type: request.source_type,
      backend: request.backend,
      target: target.target,
      started_at: captured.started_at || events[0].at,
      completed_at: captured.completed_at || now().toISOString(),
      status: captured.status || "OBSERVED",
      content_type: captured.content_type,
      content: captured.content,
      content_hash: captured.content_hash,
      raw_reference: captured.raw_reference,
      provenance: {
        ...(captured.provenance || {}),
        runtime: { version: 1, execution_id: executionId(request.request_id, request.backend, request.target) },
      },
    });
    emit("VERIFIED", { acquisition_id: result.acquisition_id, content_hash: result.content_hash || null });
    const cp = checkpoint({ acquisition_id: result.acquisition_id, content_hash: result.content_hash || null });
    emit("CHECKPOINTED", { checkpoint_sequence: cp.sequence });
    assertLease(lease, owner, now());
    emit("RELEASED", { lease_id: lease.lease_id });
    return freeze({
      execution_id: executionId(request.request_id, request.backend, request.target),
      state,
      request,
      result,
      events: freeze(events.slice()),
      checkpoints: freeze(checkpoints.slice()),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    const failureState = code.startsWith("TARGET_") ? "VALIDATION_FAILED"
      : code === "LEASE_EXPIRED" || code === "LEASE_OWNERSHIP_INVALID" ? "LEASE_LOST"
      : code === "BACKEND_INVALID" ? "EXECUTION_FAILED"
      : state === "EXECUTING" ? "EXECUTION_FAILED" : "VERIFICATION_FAILED";
    emit(failureState, { error_code: code });
    checkpoint();
    throw Object.assign(new Error(code), { execution: freeze({
      execution_id: executionId(request.request_id, request.backend, request.target),
      state: failureState, request, events: freeze(events.slice()), checkpoints: freeze(checkpoints.slice()),
    }) });
  }
}

module.exports = { STATES, createExecutionRequest, createLease, assertLease, createCheckpoint, executeAcquisition };
