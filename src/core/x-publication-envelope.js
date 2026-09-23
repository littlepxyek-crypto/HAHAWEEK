'use strict';

const crypto = require('node:crypto');
const { createResearchReport } = require('./research-report');
const { validateXContentPublicationReadiness } = require('./x-content-validation-readiness');

const ENVELOPE_VERSION = 'x-publication-envelope-v1';

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function envelopeId(payload) {
  return ENVELOPE_VERSION + ':' + crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function createXPublicationEnvelope(input) {
  requireObject(input, 'input');
  requireObject(input.research_report, 'research_report');
  requireObject(input.projection, 'projection');
  requireObject(input.readiness, 'readiness');

  const researchReport = createResearchReport(structuredClone(input.research_report));
  const projection = structuredClone(input.projection);
  const readiness = structuredClone(input.readiness);

  const verifiedReadiness = validateXContentPublicationReadiness({
    projection,
    research_report: researchReport,
  });

  if (readiness.readiness_version !== verifiedReadiness.readiness_version) {
    throw new Error('READINESS_VERSION_MISMATCH');
  }
  if (readiness.readiness_id !== verifiedReadiness.readiness_id) {
    throw new Error('READINESS_ID_MISMATCH');
  }
  if (readiness.report_id !== verifiedReadiness.report_id) {
    throw new Error('READINESS_REPORT_ID_MISMATCH');
  }
  if (readiness.validation_result !== verifiedReadiness.validation_result) {
    throw new Error('READINESS_VALIDATION_RESULT_MISMATCH');
  }
  if (JSON.stringify(readiness.content_item_ids) !== JSON.stringify(verifiedReadiness.content_item_ids)) {
    throw new Error('READINESS_CONTENT_ITEMS_MISMATCH');
  }

  const content_items = projection.content_items.map((item) => ({
    content_item_id: item.content_item_id,
    report_id: item.report_id,
    claim_id: item.claim_id,
    statement: item.statement,
    evidence_ids: [...item.evidence_ids],
  }));

  const identityPayload = {
    envelope_version: ENVELOPE_VERSION,
    readiness_id: verifiedReadiness.readiness_id,
    report_id: researchReport.report_id,
    validation_result: researchReport.validation_result,
    content_items,
    provenance_reference: structuredClone(researchReport.provenance_reference),
  };

  return {
    envelope_version: ENVELOPE_VERSION,
    envelope_id: envelopeId(identityPayload),
    readiness_id: verifiedReadiness.readiness_id,
    report_id: researchReport.report_id,
    validation_result: researchReport.validation_result,
    content_items,
    provenance_reference: structuredClone(researchReport.provenance_reference),
  };
}

module.exports = { ENVELOPE_VERSION, createXPublicationEnvelope };
