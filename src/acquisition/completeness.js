'use strict';

const crypto = require('node:crypto');

const ACQUISITION_COMPLETENESS_SCHEMA_VERSION = '1';
const STATUSES = Object.freeze(['COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN', 'EXPIRED']);

function requireString(v, name) {
  if (typeof v !== 'string' || !v) throw new Error(name.toUpperCase() + '_REQUIRED');
}

function parseTime(v, name) {
  requireString(v, name);
  const t = Date.parse(v);
  if (!Number.isFinite(t)) throw new Error('INVALID_' + name.toUpperCase());
  return t;
}

function completenessId(payload) {
  return 'acquisition-completeness:v1:' + crypto.createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Completeness is evaluated independently from whether any target evidence
 * was observed. Absence is only negative evidence when the acquisition
 * coverage itself is COMPLETE.
 */
function evaluateAcquisitionCompleteness(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('INPUT_REQUIRED');
  }

  const requestedStart = parseTime(input.requested_start, 'requested_start');
  const requestedEnd = parseTime(input.requested_end, 'requested_end');
  const observedUntil = parseTime(input.observed_until, 'observed_until');

  if (requestedEnd < requestedStart) throw new Error('INVALID_REQUESTED_WINDOW');
  if (observedUntil < requestedStart) throw new Error('OBSERVED_RANGE_BEFORE_REQUEST');

  let status;
  if (input.failed === true) {
    status = 'FAILED';
  } else if (input.terminal === true && observedUntil >= requestedEnd) {
    status = 'COMPLETE';
  } else if (input.terminal === true && observedUntil < requestedEnd) {
    status = 'PARTIAL';
  } else if (input.expired === true) {
    status = 'EXPIRED';
  } else {
    status = 'UNKNOWN';
  }

  const payload = {
    schema_version: ACQUISITION_COMPLETENESS_SCHEMA_VERSION,
    requested_start: input.requested_start,
    requested_end: input.requested_end,
    observed_until: input.observed_until,
    terminal: Boolean(input.terminal),
    failed: Boolean(input.failed),
    expired: Boolean(input.expired),
    status,
    acquisition_ids: Array.isArray(input.acquisition_ids) ? [...input.acquisition_ids] : [],
  };

  return Object.freeze({
    completeness_id: completenessId(payload),
    ...payload,
    negative_absence_permitted: status === 'COMPLETE',
  });
}

module.exports = {
  ACQUISITION_COMPLETENESS_SCHEMA_VERSION,
  STATUSES,
  evaluateAcquisitionCompleteness,
};
