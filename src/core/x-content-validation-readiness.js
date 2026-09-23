'use strict';

const crypto = require('node:crypto');
const { createResearchReport } = require('./research-report');

const PROJECTION_VERSION = 'x-content-v1';
const READINESS_VERSION = 'x-publication-readiness-v1';

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

function readinessId(payload) {
  return READINESS_VERSION + ':' + crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function validateXContentPublicationReadiness(input) {
  requireObject(input, 'input');
  requireObject(input.projection, 'projection');
  requireObject(input.research_report, 'research_report');

  const projection = structuredClone(input.projection);
  const report = createResearchReport(structuredClone(input.research_report));

  if (projection.projection_version !== PROJECTION_VERSION) {
    throw new Error('INVALID_PROJECTION_VERSION');
  }
  requireString(projection.report_id, 'report_id');
  requireString(projection.validation_result, 'validation_result');
  if (!Array.isArray(projection.evidence_ids)) throw new Error('PROJECTION_EVIDENCE_IDS_REQUIRED');
  if (!Array.isArray(projection.content_items) || projection.content_items.length === 0) {
    throw new Error('CONTENT_ITEMS_REQUIRED');
  }

  if (projection.report_id !== report.report_id) {
    throw new Error('REPORT_ID_MISMATCH');
  }
  if (projection.validation_result !== report.validation_result) {
    throw new Error('VALIDATION_RESULT_MISMATCH');
  }
  if (JSON.stringify(projection.evidence_ids) !== JSON.stringify(report.evidence_ids)) {
    throw new Error('REPORT_EVIDENCE_IDS_MISMATCH');
  }

  const claims = new Map(report.claims.map((claim) => [claim.claim_id, claim]));
  const seenClaims = new Set();

  for (const item of projection.content_items) {
    requireObject(item, 'content_item');
    requireString(item.content_item_id, 'content_item_id');
    requireString(item.report_id, 'content_item_report_id');
    requireString(item.claim_id, 'claim_id');
    requireString(item.statement, 'statement');
    if (!Array.isArray(item.evidence_ids) || item.evidence_ids.length === 0) {
      throw new Error('CONTENT_ITEM_EVIDENCE_IDS_REQUIRED');
    }
    if (item.report_id !== report.report_id) throw new Error('CONTENT_ITEM_REPORT_ID_MISMATCH');

    const claim = claims.get(item.claim_id);
    if (!claim) throw new Error('UNKNOWN_CLAIM_ID');
    if (seenClaims.has(item.claim_id)) throw new Error('DUPLICATE_CLAIM_ID');
    seenClaims.add(item.claim_id);

    if (item.statement !== claim.statement) throw new Error('CLAIM_STATEMENT_MISMATCH');
    if (JSON.stringify(item.evidence_ids) !== JSON.stringify(claim.evidence_ids)) {
      throw new Error('CLAIM_EVIDENCE_IDS_MISMATCH');
    }

    const expectedContentItemId = 'x-content:v1:' + crypto.createHash('sha256').update(JSON.stringify({
      report_id: item.report_id,
      claim_id: item.claim_id,
      statement: item.statement,
      evidence_ids: item.evidence_ids,
    })).digest('hex');

    if (item.content_item_id !== expectedContentItemId) {
      throw new Error('CONTENT_ITEM_ID_MISMATCH');
    }
  }

  if (seenClaims.size !== report.claims.length) {
    throw new Error('CLAIM_COVERAGE_MISMATCH');
  }

  const identityPayload = {
    projection_version: projection.projection_version,
    readiness_version: READINESS_VERSION,
    report_id: report.report_id,
    validation_result: report.validation_result,
    evidence_ids: report.evidence_ids,
    content_item_ids: projection.content_items.map((item) => item.content_item_id),
  };

  return {
    readiness_version: READINESS_VERSION,
    readiness_id: readinessId(identityPayload),
    publication_ready: true,
    report_id: report.report_id,
    validation_result: report.validation_result,
    content_item_ids: projection.content_items.map((item) => item.content_item_id),
  };
}

module.exports = {
  PROJECTION_VERSION,
  READINESS_VERSION,
  validateXContentPublicationReadiness,
};
