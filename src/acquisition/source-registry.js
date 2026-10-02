"use strict";

const SOURCE_TYPES = Object.freeze(["ON_CHAIN", "WEB", "SOCIAL", "CODE", "VIDEO", "OTHER"]);
const HEALTH_STATES = Object.freeze(["UNKNOWN", "PROBING", "AVAILABLE", "DEGRADED", "FAILED"]);

const HEALTH_TRANSITIONS = Object.freeze({
  UNKNOWN: Object.freeze(["PROBING"]),
  PROBING: Object.freeze(["AVAILABLE", "DEGRADED", "FAILED"]),
  AVAILABLE: Object.freeze(["PROBING"]),
  DEGRADED: Object.freeze(["PROBING", "FAILED"]),
  FAILED: Object.freeze(["PROBING"]),
});

function assertString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(code);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }
  return Object.freeze(value);
}

function cloneAndFreeze(value, code) {
  try {
    return deepFreeze(structuredClone(value));
  } catch {
    throw new TypeError(code);
  }
}

function defineSource(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("SOURCE_REQUIRED");
  }
  assertString(input.source_id, "SOURCE_ID_REQUIRED");
  assertString(input.source_type, "SOURCE_TYPE_REQUIRED");
  assertString(input.backend, "BACKEND_REQUIRED");

  if (!SOURCE_TYPES.includes(input.source_type)) throw new TypeError("SOURCE_TYPE_UNSUPPORTED");
  if (input.authority !== undefined && input.authority !== "ACQUISITION_ONLY") {
    throw new Error("AUTHORITY_ESCALATION_FORBIDDEN");
  }
  if (input.capabilities !== undefined && !Array.isArray(input.capabilities)) {
    throw new TypeError("CAPABILITIES_MUST_BE_ARRAY");
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    throw new TypeError("ENABLED_MUST_BE_BOOLEAN");
  }

  return deepFreeze({
    source_id: input.source_id,
    source_type: input.source_type,
    backend: input.backend,
    capabilities: [...(input.capabilities || [])],
    authority: "ACQUISITION_ONLY",
    availability: input.availability || "UNKNOWN",
    rate_limit: cloneAndFreeze(input.rate_limit || {}, "RATE_LIMIT_INVALID"),
    authentication: cloneAndFreeze(input.authentication || {}, "AUTHENTICATION_INVALID"),
    provenance: cloneAndFreeze(input.provenance || {}, "PROVENANCE_INVALID"),
    enabled: input.enabled === true,
  });
}

function transitionHealth(current, next) {
  if (!HEALTH_STATES.includes(current) || !HEALTH_STATES.includes(next)) {
    throw new TypeError("HEALTH_STATE_UNSUPPORTED");
  }
  if (!HEALTH_TRANSITIONS[current].includes(next)) {
    throw new Error("HEALTH_TRANSITION_INVALID");
  }
  return next;
}

module.exports = {
  SOURCE_TYPES,
  HEALTH_STATES,
  HEALTH_TRANSITIONS,
  deepFreeze,
  cloneAndFreeze,
  defineSource,
  transitionHealth,
};
