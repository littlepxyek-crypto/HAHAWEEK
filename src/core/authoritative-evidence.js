'use strict';

const { AUTHORITY_CLASSES } = require('./authoritative-replay');

function fail(message) {
  throw new TypeError(message);
}

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`authoritative evidence requires ${field}`);
  }
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`authoritative evidence requires non-empty ${field}`);
  }
}

function createAuthoritativeEvidenceEnvelope(input) {
  requiredObject(input, 'capture input');

  if (input.evidence_class !== AUTHORITY_CLASSES.AUTHORITATIVE) {
    fail('authoritative evidence input must be AUTHORITATIVE');
  }

  if (input.schema_version !== '1') {
    fail('unsupported authoritative evidence schema version');
  }

  if (!Number.isInteger(input.chain_id) || input.chain_id < 0) {
    fail('authoritative evidence requires a valid chain_id');
  }

  nonEmptyString(input.source, 'source');
  nonEmptyString(input.evidence_id, 'evidence_id');

  requiredObject(input.request, 'request');
  nonEmptyString(input.request.method, 'request.method');
  if (!Object.prototype.hasOwnProperty.call(input.request, 'params')) {
    fail('authoritative evidence requires request.params');
  }

  if (!Object.prototype.hasOwnProperty.call(input, 'response_payload') || input.response_payload === undefined) {
    fail('authoritative evidence requires response_payload');
  }

  requiredObject(input.observation, 'observation');
  if (!Number.isInteger(input.observation.block_number) ||
      input.observation.block_number < 0) {
    fail('authoritative evidence requires observation.block_number');
  }

  requiredObject(input.capture, 'capture');
  nonEmptyString(input.capture.captured_at, 'capture.captured_at');

  if (!Array.isArray(input.events) || input.events.length === 0) {
    fail('authoritative evidence requires events');
  }

  return structuredClone({
    schema_version: input.schema_version,
    evidence_class: input.evidence_class,
    chain_id: input.chain_id,
    source: input.source,
    evidence_id: input.evidence_id,
    request: input.request,
    response_payload: input.response_payload,
    observation: input.observation,
    capture: input.capture,
    events: input.events,
  });
}

module.exports = {
  createAuthoritativeEvidenceEnvelope,
};
