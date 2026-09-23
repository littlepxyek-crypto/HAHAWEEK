'use strict';

const crypto = require('node:crypto');

const DELIVERY_ADAPTER_RESULT_VERSION = 'publication-delivery-adapter-result-v1';
const PUBLICATION_ENVELOPE_VERSION = 'x-publication-envelope-v1';
const VALIDATION_RESULTS = new Set(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function envelopeIdentityPayload(envelope) {
  return {
    envelope_version: envelope.envelope_version,
    readiness_id: envelope.readiness_id,
    report_id: envelope.report_id,
    validation_result: envelope.validation_result,
    content_items: envelope.content_items.map((item) => ({
      content_item_id: item.content_item_id,
      report_id: item.report_id,
      claim_id: item.claim_id,
      statement: item.statement,
      evidence_ids: [...item.evidence_ids],
    })),
    provenance_reference: structuredClone(envelope.provenance_reference),
  };
}

function envelopeId(envelope) {
  return PUBLICATION_ENVELOPE_VERSION + ':' +
    crypto.createHash('sha256')
      .update(JSON.stringify(envelopeIdentityPayload(envelope)))
      .digest('hex');
}

function validatePublicationEnvelope(envelope) {
  requireObject(envelope, 'envelope');
  if (envelope.envelope_version !== PUBLICATION_ENVELOPE_VERSION) throw new Error('ENVELOPE_VERSION_INVALID');
  for (const field of ['envelope_id', 'readiness_id', 'report_id']) requireString(envelope[field], field);
  if (!VALIDATION_RESULTS.has(envelope.validation_result)) throw new Error('VALIDATION_RESULT_INVALID');
  if (!Array.isArray(envelope.content_items) || envelope.content_items.length === 0) throw new Error('CONTENT_ITEMS_REQUIRED');
  for (const item of envelope.content_items) {
    requireObject(item, 'content_item');
    for (const field of ['content_item_id', 'report_id', 'claim_id', 'statement']) requireString(item[field], field);
    if (item.report_id !== envelope.report_id) throw new Error('CONTENT_ITEM_REPORT_ID_MISMATCH');
    if (!Array.isArray(item.evidence_ids) || item.evidence_ids.length === 0 || item.evidence_ids.some((id) => typeof id !== 'string' || id.length === 0)) {
      throw new Error('CONTENT_ITEM_EVIDENCE_IDS_INVALID');
    }
  }
  if (!Object.hasOwn(envelope, 'provenance_reference')) throw new Error('PROVENANCE_REFERENCE_REQUIRED');
  if (envelope.envelope_id !== envelopeId(envelope)) throw new Error('ENVELOPE_ID_MISMATCH');
  return true;
}

function resultId(payload) {
  return DELIVERY_ADAPTER_RESULT_VERSION + ':' + crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function createPublicationDeliveryAdapterResult(input) {
  requireObject(input, 'input');
  validatePublicationEnvelope(input.envelope);
  const envelope = structuredClone(input.envelope);
  const identityPayload = {
    result_version: DELIVERY_ADAPTER_RESULT_VERSION,
    envelope_id: envelope.envelope_id,
    readiness_id: envelope.readiness_id,
    report_id: envelope.report_id,
    validation_result: envelope.validation_result,
    content_item_ids: envelope.content_items.map((item) => item.content_item_id),
    disposition: 'NOT_ATTEMPTED',
  };
  return {
    result_version: DELIVERY_ADAPTER_RESULT_VERSION,
    result_id: resultId(identityPayload),
    envelope_id: envelope.envelope_id,
    readiness_id: envelope.readiness_id,
    report_id: envelope.report_id,
    validation_result: envelope.validation_result,
    content_item_ids: [...identityPayload.content_item_ids],
    disposition: 'NOT_ATTEMPTED',
  };
}

module.exports = { DELIVERY_ADAPTER_RESULT_VERSION, PUBLICATION_ENVELOPE_VERSION, validatePublicationEnvelope, createPublicationDeliveryAdapterResult };