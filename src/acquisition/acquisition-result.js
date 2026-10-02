"use strict";

const crypto = require("node:crypto");

const STATUSES = Object.freeze(["OBSERVED", "UNAVAILABLE", "DEGRADED", "FAILED"]);

function requiredString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(code);
}

function hashContent(content) {
  if (!(typeof content === "string" || Buffer.isBuffer(content))) {
    throw new TypeError("CONTENT_REQUIRED");
  }
  return crypto.createHash("sha256").update(content).digest("hex");
}

function createAcquisitionResult(input) {
  if (!input || typeof input !== "object") throw new TypeError("ACQUISITION_REQUIRED");

  requiredString(input.acquisition_id, "ACQUISITION_ID_REQUIRED");
  requiredString(input.source_id, "SOURCE_ID_REQUIRED");
  requiredString(input.source_type, "SOURCE_TYPE_REQUIRED");
  requiredString(input.backend, "BACKEND_REQUIRED");
  requiredString(input.target, "TARGET_REQUIRED");
  requiredString(input.started_at, "STARTED_AT_REQUIRED");
  requiredString(input.completed_at, "COMPLETED_AT_REQUIRED");
  requiredString(input.status, "STATUS_REQUIRED");

  if (!STATUSES.includes(input.status)) throw new TypeError("STATUS_UNSUPPORTED");

  if (input.status === "OBSERVED") {
    requiredString(input.content_type, "CONTENT_TYPE_REQUIRED");
    if (input.content === undefined) throw new TypeError("CONTENT_REQUIRED");
    const computedHash = hashContent(input.content);
    if (input.content_hash && input.content_hash !== computedHash) {
      throw new Error("CONTENT_HASH_MISMATCH");
    }
    input = { ...input, content_hash: computedHash };
  }

  if (input.status !== "OBSERVED" && input.content !== undefined) {
    throw new Error("NON_OBSERVED_CONTENT_FORBIDDEN");
  }

  if (input.raw_reference !== undefined) requiredString(input.raw_reference, "RAW_REFERENCE_INVALID");

  const provenance = input.provenance && typeof input.provenance === "object"
    ? structuredClone(input.provenance)
    : {};

  return Object.freeze({
    acquisition_id: input.acquisition_id,
    source_id: input.source_id,
    source_type: input.source_type,
    backend: input.backend,
    target: input.target,
    started_at: input.started_at,
    completed_at: input.completed_at,
    status: input.status,
    ...(input.content_type ? { content_type: input.content_type } : {}),
    ...(input.content_hash ? { content_hash: input.content_hash } : {}),
    ...(input.raw_reference ? { raw_reference: input.raw_reference } : {}),
    provenance: Object.freeze(provenance),
  });
}

module.exports = {
  STATUSES,
  hashContent,
  createAcquisitionResult,
};
