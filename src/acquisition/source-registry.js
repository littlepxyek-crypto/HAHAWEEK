"use strict";

/**
 * Non-authoritative registry for acquisition capabilities.
 * It describes how a source MAY be observed; it never asserts source truth.
 */

const SOURCE_TYPES = Object.freeze(["ON_CHAIN", "WEB", "SOCIAL", "CODE", "VIDEO", "OTHER"]);
const HEALTH_STATES = Object.freeze(["UNKNOWN", "PROBING", "AVAILABLE", "DEGRADED", "FAILED"]);

function assertString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(code);
}

function defineSource(input) {
  if (!input || typeof input !== "object") throw new TypeError("SOURCE_REQUIRED");
  assertString(input.source_id, "SOURCE_ID_REQUIRED");
  assertString(input.source_type, "SOURCE_TYPE_REQUIRED");
  assertString(input.backend, "BACKEND_REQUIRED");

  if (!SOURCE_TYPES.includes(input.source_type)) throw new TypeError("SOURCE_TYPE_UNSUPPORTED");
  if (input.capabilities !== undefined && !Array.isArray(input.capabilities)) {
    throw new TypeError("CAPABILITIES_MUST_BE_ARRAY");
  }

  return Object.freeze({
    source_id: input.source_id,
    source_type: input.source_type,
    backend: input.backend,
    capabilities: Object.freeze([...(input.capabilities || [])]),
    authority: "ACQUISITION_ONLY",
    enabled: input.enabled === true,
  });
}

function transitionHealth(current, next) {
  if (!HEALTH_STATES.includes(current) || !HEALTH_STATES.includes(next)) {
    throw new TypeError("HEALTH_STATE_UNSUPPORTED");
  }
  if (current === "FAILED" && next === "AVAILABLE") {
    return "PROBING";
  }
  return next;
}

module.exports = {
  SOURCE_TYPES,
  HEALTH_STATES,
  defineSource,
  transitionHealth,
};
