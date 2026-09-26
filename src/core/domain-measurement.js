'use strict';

const crypto = require('node:crypto');
const {
  createSurveillanceObservation,
} = require('./surveillance-observation');

const DOMAIN_MEASUREMENT_SCHEMA_VERSION = '1';
const RULE_VERSIONS = Object.freeze({
  LIQUIDITY_ACTIVITY: 'domain-measurement-liquidity-v1',
  TRANSACTION_COST: 'domain-measurement-transaction-cost-v1',
  CONTRACT_TRANSPARENCY: 'domain-measurement-contract-transparency-v1',
  PROMOTIONAL_PROVENANCE: 'domain-measurement-promotional-provenance-v1',
});
const COMPARABILITY = new Set(['COMPATIBLE', 'INCOMPATIBLE', 'UNKNOWN', 'INCONCLUSIVE']);

function fail(code) {
  throw new TypeError(code);
}
function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field + '_REQUIRED');
}
function string(value, field) {
  if (typeof value !== 'string' || value.length === 0) fail(field + '_REQUIRED');
}
function nullableString(value, field) {
  if (value !== null) string(value, field);
}
function integerString(value, field) {
  string(value, field);
  if (!/^(0|[1-9][0-9]*)$/.test(value)) fail(field + '_INVALID');
}
function signedIntegerString(value, field) {
  string(value, field);
  if (!/^-?(0|[1-9][0-9]*)$/.test(value)) fail(field + '_INVALID');
}
function timestamp(value, field, nullable = false) {
  if (nullable && value === null) return;
  string(value, field);
  if (!Number.isFinite(Date.parse(value))) fail(field + '_INVALID');
}
function exactSet(value, allowed, field) {
  string(value, field);
  if (!allowed.has(value)) fail(field + '_INVALID');
}
function admitted(refs, field, allowed) {
  if (!Array.isArray(refs)) fail(field + '_REQUIRED');
  const seen = new Set();
  for (const ref of refs) {
    string(ref, field + '_ENTRY');
    if (seen.has(ref)) fail(field + '_DUPLICATE');
    seen.add(ref);
    if (!allowed.has(ref)) fail(field + '_UNRESOLVED');
  }
}
function validateLiquidity(payload) {
  object(payload, 'payload');
  exactSet(payload.measurement_kind, new Set(['LIQUIDITY_ACTIVITY', 'EXECUTABLE_DEPTH']), 'measurement_kind');
  string(payload.pool_ref, 'pool_ref');
  if (payload.measurement_kind === 'LIQUIDITY_ACTIVITY') {
    signedIntegerString(payload.liquidity_delta, 'liquidity_delta');
    return;
  }
  for (const field of [
    'asset_refs', 'snapshot_block', 'quote_direction', 'quote_amount',
    'executable_amount', 'model_id', 'model_version',
    'model_parameters_digest', 'input_evidence_refs', 'measurement_version',
  ]) {
    if (field === 'asset_refs' || field === 'input_evidence_refs') {
      if (!Array.isArray(payload[field]) || payload[field].length === 0) fail(field + '_REQUIRED');
      payload[field].forEach((v) => string(v, field + '_ENTRY'));
    } else if (field === 'snapshot_block') {
      integerString(payload[field], field);
    } else {
      string(payload[field], field);
    }
  }
  if (payload.fee_tier !== undefined) string(payload.fee_tier, 'fee_tier');
  if (payload.model_id === 'CONSTANT_PRODUCT_GENERIC') fail('UNSUPPORTED_AMM_MODEL');
}

function validateTransactionCost(payload) {
  object(payload, 'payload');
  for (const field of ['measurement_kind', 'transaction_ref', 'block_ref', 'gas_used', 'effective_gas_price', 'fee_asset', 'measurement_version']) {
    string(payload[field], field);
  }
  integerString(payload.gas_used, 'gas_used');
  integerString(payload.effective_gas_price, 'effective_gas_price');
  const expectedFee = (BigInt(payload.gas_used) * BigInt(payload.effective_gas_price)).toString();
  if (payload.native_fee !== undefined && payload.native_fee !== expectedFee) fail('native_fee_MISMATCH');
  payload.native_fee = expectedFee;
  if (payload.conversion_ref !== undefined && payload.conversion_ref !== null) {
    string(payload.conversion_ref, 'conversion_ref');
    timestamp(payload.conversion_time, 'conversion_time');
    string(payload.conversion_source, 'conversion_source');
  } else {
    payload.conversion_ref = null;
    payload.conversion_time = null;
    payload.conversion_source = null;
  }
  if (payload.comparability_status !== undefined) exactSet(payload.comparability_status, COMPARABILITY, 'comparability_status');
  else payload.comparability_status = 'UNKNOWN';
}

function validateContractTransparency(payload) {
  object(payload, 'payload');
  for (const field of [
    'contract_ref', 'deployer_ref', 'source_verification_state',
    'bytecode_ref', 'proxy_state', 'upgradeability_state',
    'ownership_control_state', 'deployment_transaction_ref', 'measurement_version'
  ]) {
    string(payload[field], field);
  }
  object(payload.property_evidence, 'property_evidence');
  for (const key of Object.keys(payload.property_evidence)) {
    if (!Array.isArray(payload.property_evidence[key]) || payload.property_evidence[key].length === 0) {
      fail('property_evidence_' + key + '_REQUIRED');
    }
    payload.property_evidence[key].forEach((ref) => string(ref, 'property_evidence_ref'));
  }
}

function validatePromotionalProvenance(payload) {
  object(payload, 'payload');
  for (const field of ['source_ref', 'channel', 'claim_ref', 'claim_content_digest', 'measurement_version']) {
    string(payload[field], field);
  }
  timestamp(payload.capture_time, 'capture_time');
  timestamp(payload.publication_time, 'publication_time', true);
  nullableString(payload.promotion_relationship, 'promotion_relationship');
  if (!Array.isArray(payload.provenance_chain) || payload.provenance_chain.length === 0) fail('provenance_chain_REQUIRED');
  payload.provenance_chain.forEach((ref) => string(ref, 'provenance_chain_ENTRY'));
}

function validatePayload(type, payload) {
  if (type === 'LIQUIDITY_ACTIVITY') validateLiquidity(payload);
  else if (type === 'TRANSACTION_COST') validateTransactionCost(payload);
  else if (type === 'CONTRACT_TRANSPARENCY') validateContractTransparency(payload);
  else if (type === 'PROMOTIONAL_PROVENANCE') validatePromotionalProvenance(payload);
  else fail('UNSUPPORTED_DOMAIN_MEASUREMENT_TYPE');
}

function createDomainMeasurement(input) {
  object(input, 'input');
  const evidenceRefs = input.evidence_refs;
  const provenanceRef = input.provenance_ref;
  object(input.admission, 'admission');
  const allowedEvidence = new Set(input.admission.evidence_refs || []);
  const allowedProvenance = new Set(input.admission.provenance_refs || []);
  admitted(evidenceRefs, 'evidence_refs', allowedEvidence);
  if (!allowedProvenance.has(provenanceRef)) fail('provenance_ref_UNRESOLVED');

  const payload = structuredClone(input.payload);
  validatePayload(input.observation_type, payload);

  const ruleVersion = input.rule_version || RULE_VERSIONS[input.observation_type];
  string(ruleVersion, 'rule_version');

  const observation = createSurveillanceObservation({
    ...input,
    schema_version: DOMAIN_MEASUREMENT_SCHEMA_VERSION,
    rule_version: ruleVersion,
    payload,
  });
  return observation;
}

module.exports = {
  DOMAIN_MEASUREMENT_SCHEMA_VERSION,
  RULE_VERSIONS,
  COMPARABILITY,
  createDomainMeasurement,
};
