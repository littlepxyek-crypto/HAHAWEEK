'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createClaimPromotion } = require('../src/core/claim-promotion-provenance');

function input(overrides = {}) {
  const report = {
    report_id: 'report:v1:test', validation_result: 'CONFIRMED',
    evidence_ids: ['e1', 'e2'],
    claims: [{ claim_id: 'claim:1', statement: 'Observed formation.', evidence_ids: ['e1'] }],
  };
  return {
    claim: { claim_id: 'claim:1', statement: 'Observed formation.', evidence_ids: ['e1'] },
    research_report: report,
    provenance_reference: { report_id: report.report_id, evidence_ids: ['e1'] },
    ...overrides,
  };
}

test('promotes a traceable claim as derived research only', () => {
  const result = createClaimPromotion(input());
  assert.match(result.promotion_id, /^claim-promotion:v1:[a-f0-9]{64}$/);
  assert.equal(result.promoted_kind, 'RESEARCH_CLAIM');
  assert.equal(result.authority, 'DERIVED_RESEARCH_ONLY');
});

test('preserves inconclusive validation without reinterpretation', () => {
  const x = input({ research_report: { ...input().research_report, validation_result: 'INCONCLUSIVE' } });
  assert.equal(createClaimPromotion(x).validation_result, 'INCONCLUSIVE');
});

test('rejects claim evidence absent from report', () => {
  assert.throws(() => createClaimPromotion(input({ claim: { claim_id: 'claim:1', statement: 'Observed formation.', evidence_ids: ['missing'] } })), /CLAIM_EVIDENCE_NOT_IN_REPORT/);
});

test('rejects claim absent from report', () => {
  assert.throws(() => createClaimPromotion(input({ claim: { claim_id: 'claim:other', statement: 'Other.', evidence_ids: ['e1'] } })), /CLAIM_NOT_PRESENT_IN_REPORT/);
});

test('rejects provenance report mismatch', () => {
  assert.throws(() => createClaimPromotion(input({ provenance_reference: { report_id: 'report:v1:other', evidence_ids: ['e1'] } })), /CLAIM_PROVENANCE_REPORT_ID_MISMATCH/);
});

test('rejects unsupported validation state', () => {
  const x = input({ research_report: { ...input().research_report, validation_result: 'UNKNOWN' } });
  assert.throws(() => createClaimPromotion(x), /CLAIM_VALIDATION_RESULT_NOT_PROMOTABLE/);
});

test('rejects evidence absent from provenance', () => {
  assert.throws(() => createClaimPromotion(input({ provenance_reference: { report_id: 'report:v1:test', evidence_ids: ['e2'] } })), /CLAIM_EVIDENCE_NOT_IN_PROVENANCE/);
});