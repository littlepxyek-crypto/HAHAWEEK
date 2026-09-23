'use strict';

const crypto = require('node:crypto');
const { createResearchReport } = require('./research-report');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function contentItemId(item) {
  const payload = JSON.stringify({
    report_id: item.report_id,
    claim_id: item.claim_id,
    statement: item.statement,
    evidence_ids: item.evidence_ids,
  });
  return 'x-content:v1:' + crypto.createHash('sha256').update(payload).digest('hex');
}

function createXContentProjection(reportInput) {
  requireObject(reportInput, 'report');
  const report = createResearchReport(structuredClone(reportInput));
  const content_items = report.claims.map((claim) => {
    const item = {
      report_id: report.report_id,
      claim_id: claim.claim_id,
      statement: claim.statement,
      evidence_ids: [...claim.evidence_ids],
    };
    return { content_item_id: contentItemId(item), ...item };
  });
  return {
    projection_version: 'x-content-v1',
    report_id: report.report_id,
    validation_result: report.validation_result,
    evidence_ids: [...report.evidence_ids],
    provenance_reference: structuredClone(report.provenance_reference),
    content_items,
  };
}

module.exports = { createXContentProjection };
