'use strict';

const crypto = require('node:crypto');

const CLAIM_PROMOTION_SCHEMA_VERSION = '1';
const CLAIM_PROMOTION_RULE_VERSION = 'claim-promotion-provenance-v1';
const PROMOTED_KIND = 'RESEARCH_CLAIM';
const ALLOWED_VALIDATION_RESULTS = new Set(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(name.toUpperCase() + '_REQUIRED');
}
function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(name.toUpperCase() + '_REQUIRED');
}
function uniqueStrings(values, name) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(name.toUpperCase() + '_REQUIRED');
  const seen = new Set();
  for (const value of values) {
    requireString(value, name);
    if (seen.has(value)) throw new TypeError(name.toUpperCase() + '_DUPLICATE');
    seen.add(value);
  }
  return [...values];
}

function createClaimPromotion(input) {
  requireObject(input, 'input');
  requireObject(input.claim, 'claim');
  requireObject(input.research_report, 'research_report');
  requireObject(input.provenance_reference, 'provenance_reference');

  requireString(input.claim.claim_id, 'claim_id');
  requireString(input.claim.statement, 'statement');
  const evidenceIds = uniqueStrings(input.claim.evidence_ids, 'evidence_ids');
  requireString(input.research_report.report_id, 'research_report_id');
  requireString(input.research_report.validation_result, 'validation_result');
  requireString(input.provenance_reference.report_id, 'provenance_report_id');
  const provenanceEvidenceIds = uniqueStrings(input.provenance_reference.evidence_ids, 'provenance_evidence_ids');
  const ruleVersion = input.claim_rule_version ?? CLAIM_PROMOTION_RULE_VERSION;
  requireString(ruleVersion, 'claim_rule_version');

  if (!ALLOWED_VALIDATION_RESULTS.has(input.research_report.validation_result)) {
    throw new TypeError('CLAIM_VALIDATION_RESULT_NOT_PROMOTABLE');
  }
  if (input.provenance_reference.report_id !== input.research_report.report_id) {
    throw new TypeError('CLAIM_PROVENANCE_REPORT_ID_MISMATCH');
  }
  if (!Array.isArray(input.research_report.claims)) throw new TypeError('REPORT_CLAIMS_REQUIRED');
  const reportClaim = input.research_report.claims.find((claim) => claim && claim.claim_id === input.claim.claim_id);
  if (!reportClaim) throw new TypeError('CLAIM_NOT_PRESENT_IN_REPORT');
  const reportEvidenceIds = new Set(Array.isArray(input.research_report.evidence_ids) ? input.research_report.evidence_ids : []);
  for (const id of evidenceIds) {
    if (!reportEvidenceIds.has(id)) throw new TypeError('CLAIM_EVIDENCE_NOT_IN_REPORT');
  }
  for (const id of evidenceIds) {
    if (!provenanceEvidenceIds.includes(id)) throw new TypeError('CLAIM_EVIDENCE_NOT_IN_PROVENANCE');
  }

  const identityPayload = {
    schema_version: CLAIM_PROMOTION_SCHEMA_VERSION,
    claim_rule_version: ruleVersion,
    promoted_kind: PROMOTED_KIND,
    claim_id: input.claim.claim_id,
    statement: input.claim.statement,
    evidence_ids: [...evidenceIds].sort(),
    research_report_id: input.research_report.report_id,
    validation_result: input.research_report.validation_result,
    provenance_reference: structuredClone(input.provenance_reference),
  };
  const promotion_id = 'claim-promotion:v1:' + crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');
  return structuredClone({
    schema_version: CLAIM_PROMOTION_SCHEMA_VERSION,
    promotion_id,
    claim_rule_version: ruleVersion,
    promoted_kind: PROMOTED_KIND,
    claim_id: input.claim.claim_id,
    statement: input.claim.statement,
    evidence_ids: evidenceIds,
    research_report_id: input.research_report.report_id,
    validation_result: input.research_report.validation_result,
    provenance_reference: input.provenance_reference,
    authority: 'DERIVED_RESEARCH_ONLY',
  });
}

module.exports = { CLAIM_PROMOTION_SCHEMA_VERSION, CLAIM_PROMOTION_RULE_VERSION, PROMOTED_KIND, ALLOWED_VALIDATION_RESULTS, createClaimPromotion };