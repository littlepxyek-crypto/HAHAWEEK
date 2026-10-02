"use strict";

const { HEALTH_STATES, transitionHealth, cloneAndFreeze } = require("./source-registry");

function createHealthRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("HEALTH_INPUT_REQUIRED");
  }
  if (typeof input.source_id !== "string" || !input.source_id) {
    throw new TypeError("SOURCE_ID_REQUIRED");
  }
  if (!HEALTH_STATES.includes(input.state)) {
    throw new TypeError("HEALTH_STATE_UNSUPPORTED");
  }

  return Object.freeze({
    source_id: input.source_id,
    state: input.state,
    checked_at: input.checked_at || null,
    probe_id: input.probe_id || null,
    backend: input.backend || null,
    error_code: input.error_code || null,
    latency_ms: input.latency_ms ?? null,
    provenance: cloneAndFreeze(input.provenance || {}, "PROVENANCE_INVALID"),
  });
}

function nextHealth(record, state) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("HEALTH_RECORD_REQUIRED");
  }
  return createHealthRecord({
    ...record,
    state: transitionHealth(record.state, state),
  });
}

module.exports = { createHealthRecord, nextHealth };
