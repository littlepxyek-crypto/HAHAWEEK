'use strict';

const AUTHORITY_CLASSES = Object.freeze({
  SYNTHETIC: 'SYNTHETIC',
  DISCOVERY_ONLY: 'DISCOVERY_ONLY',
  AUTHORITATIVE: 'AUTHORITATIVE',
});

function fail(message) {
  throw new TypeError(message);
}

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`authoritative replay requires non-empty ${field}`);
  }
}

function validateAuthoritativeReplayEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    fail('authoritative replay envelope must be an object');
  }

  if (envelope.evidence_class !== AUTHORITY_CLASSES.AUTHORITATIVE) {
    fail('replay input is not AUTHORITATIVE');
  }

  if (envelope.schema_version !== '1') {
    fail('unsupported authoritative replay schema version');
  }

  if (!Number.isInteger(envelope.chain_id) || envelope.chain_id < 0) {
    fail('authoritative replay requires a valid chain_id');
  }

  assertNonEmptyString(envelope.source, 'source');
  assertNonEmptyString(envelope.evidence_id, 'evidence_id');

  if (!envelope.request || typeof envelope.request !== 'object') {
    fail('authoritative replay requires request provenance');
  }

  assertNonEmptyString(envelope.request.method, 'request.method');
  if (!Object.prototype.hasOwnProperty.call(envelope.request, 'params') || envelope.request.params === undefined) {
    fail('authoritative replay requires request.params');
  }

  if (!Object.prototype.hasOwnProperty.call(envelope, 'response_payload') || envelope.response_payload === undefined) {
    fail('authoritative replay requires response_payload');
  }

  if (!envelope.observation || typeof envelope.observation !== 'object') {
    fail('authoritative replay requires observation provenance');
  }

  if (!Number.isInteger(envelope.observation.block_number) ||
      envelope.observation.block_number < 0) {
    fail('authoritative replay requires observation.block_number');
  }

  if (!envelope.capture || typeof envelope.capture !== 'object') {
    fail('authoritative replay requires capture metadata');
  }

  assertNonEmptyString(envelope.capture.captured_at, 'capture.captured_at');

  if (!Array.isArray(envelope.events) || envelope.events.length === 0) {
    fail('authoritative replay requires at least one derived event');
  }

  return true;
}

function replayAuthoritativeEvidence(envelope) {
  validateAuthoritativeReplayEnvelope(envelope);

  return {
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: envelope.chain_id,
    evidence_id: envelope.evidence_id,
    source: envelope.source,
    events: envelope.events.map((event) => ({ ...event })),
  };
}

module.exports = {
  AUTHORITY_CLASSES,
  validateAuthoritativeReplayEnvelope,
  replayAuthoritativeEvidence,
};
