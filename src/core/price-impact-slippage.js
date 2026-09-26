'use strict';

const { createSurveillanceObservation } = require('./surveillance-observation');

const DIRECTIONS = new Set(['BASE_TO_QUOTE', 'QUOTE_TO_BASE']);
const MEASUREMENT_KINDS = new Set(['PRICE_IMPACT', 'SLIPPAGE']);
const RULE_VERSIONS = Object.freeze({
  PRICE_IMPACT: 'domain-measurement-price-impact-v1',
  SLIPPAGE: 'domain-measurement-slippage-v1',
});

function fail(code) { throw new TypeError(code); }
function nonEmpty(value, field) { if (typeof value !== 'string' || value.length === 0) fail(field + '_REQUIRED'); }
function uint(value, field) {
  nonEmpty(value, field);
  if (!/^(0|[1-9][0-9]*)$/.test(value)) fail(field + '_INVALID');
  return BigInt(value);
}
function decimals(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 255) fail(field + '_INVALID');
  return value;
}
function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) { const t = x % y; x = y; y = t; }
  return x;
}
function rational(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint' || denominator <= 0n) fail('RATIONAL_INVALID');
  const divisor = gcd(numerator, denominator) || 1n;
  return { numerator: (numerator / divisor).toString(), denominator: (denominator / divisor).toString() };
}
function parseRational(value, field) {
  if (!value || typeof value !== 'object') fail(field + '_REQUIRED');
  return rational(uint(value.numerator, field + '_NUMERATOR'), uint(value.denominator, field + '_DENOMINATOR'));
}
function invert(value, field) {
  const r = parseRational(value, field);
  if (r.numerator === '0') fail(field + '_ZERO');
  return rational(BigInt(r.denominator), BigInt(r.numerator));
}
function subtract(a, b) {
  return rational(BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}
function divide(a, b, field) {
  const rb = parseRational(b, field);
  if (rb.numerator === '0') fail(field + '_ZERO');
  return rational(BigInt(a.numerator) * BigInt(rb.denominator), BigInt(a.denominator) * BigInt(rb.numerator));
}
function pow10(n) { return 10n ** BigInt(n); }
function assetIndex(pool, asset, field) {
  nonEmpty(asset, field);
  const normalized = asset.toLowerCase();
  const c0 = String(pool.currency0).toLowerCase();
  const c1 = String(pool.currency1).toLowerCase();
  if (normalized === c0) return 0;
  if (normalized === c1) return 1;
  fail(field + '_NOT_IN_POOL');
}
function referencePrice({ pool, baseAssetRef, quoteAssetRef, sqrtPriceX96, decimals0, decimals1 }) {
  const base = assetIndex(pool, baseAssetRef, 'base_asset_ref');
  const quote = assetIndex(pool, quoteAssetRef, 'quote_asset_ref');
  if (base === quote) fail('BASE_QUOTE_SAME_ASSET');
  const sqrt = uint(sqrtPriceX96, 'sqrtPriceX96');
  if (sqrt === 0n) fail('sqrtPriceX96_ZERO');
  const d0 = decimals(decimals0, 'decimals0');
  const d1 = decimals(decimals1, 'decimals1');
  const token1PerToken0 = rational(sqrt * sqrt * pow10(d0), (2n ** 192n) * pow10(d1));
  return quote === 1 ? (base === 0 ? token1PerToken0 : invert(token1PerToken0, 'reference_price')) : invert(token1PerToken0, 'reference_price');
}
function executionPrice({ pool, baseAssetRef, quoteAssetRef, amount0, amount1, decimals0, decimals1 }) {
  const base = assetIndex(pool, baseAssetRef, 'base_asset_ref');
  const quote = assetIndex(pool, quoteAssetRef, 'quote_asset_ref');
  if (base === quote) fail('BASE_QUOTE_SAME_ASSET');
  const a0 = uint(amount0, 'amount0');
  const a1 = uint(amount1, 'amount1');
  if (a0 === 0n || a1 === 0n) fail('EXECUTION_AMOUNT_ZERO');
  const d0 = decimals(decimals0, 'decimals0');
  const d1 = decimals(decimals1, 'decimals1');
  const raw = quote === 1 ? rational(a1 * pow10(d0), a0 * pow10(d1)) : rational(a0 * pow10(d1), a1 * pow10(d0));
  return raw;
}
function calculateImpact(reference, execution, field) {
  const r = parseRational(reference, field + '_REFERENCE');
  const e = parseRational(execution, field + '_EXECUTION');
  if (r.numerator === '0') fail(field + '_REFERENCE_ZERO');
  return divide(subtract(r, e), r, field + '_RESULT');
}
function ensureDirection(direction) { if (!DIRECTIONS.has(direction)) fail('direction_INVALID'); }
function admittedEvidence(input) {
  if (!input.admission || typeof input.admission !== 'object') fail('admission_REQUIRED');
  const allowed = new Set(input.admission.evidence_refs || []);
  for (const ref of input.evidence_refs || []) if (!allowed.has(ref)) fail('evidence_ref_UNRESOLVED');
  const provenance = new Set(input.admission.provenance_refs || []);
  if (!provenance.has(input.provenance_ref)) fail('provenance_ref_UNRESOLVED');
  for (const ref of input.input_evidence_refs || []) if (!allowed.has(ref)) fail('input_evidence_ref_UNRESOLVED');
}
function ensurePool(pool) {
  if (!pool || typeof pool !== 'object') fail('pool_REQUIRED');
  nonEmpty(String(pool.currency0), 'pool_currency0');
  nonEmpty(String(pool.currency1), 'pool_currency1');
}
function createMeasurement(input) {
  if (!input || typeof input !== 'object') fail('input_REQUIRED');
  ensurePool(input.pool);
  ensureDirection(input.direction);
  admittedEvidence(input);
  if (!MEASUREMENT_KINDS.has(input.measurement_kind)) fail('measurement_kind_INVALID');
  const reference = referencePrice(input);
  const execution = executionPrice(input);
  const result = calculateImpact(reference, execution, input.measurement_kind === 'PRICE_IMPACT' ? 'price_impact' : 'slippage');
  if (input.measurement_kind === 'SLIPPAGE') {
    if (!input.quote_reference || typeof input.quote_reference !== 'object') fail('quote_reference_REQUIRED');
    nonEmpty(input.quote_reference.evidence_ref, 'quote_evidence_ref');
    if (!(input.input_evidence_refs || []).includes(input.quote_reference.evidence_ref)) fail('quote_evidence_NOT_BOUND');
    if (input.quote_reference.execution_identity === input.execution_identity) fail('quote_execution_NOT_INDEPENDENT');
    const quote = parseRational(input.quote_reference.price, 'quote_price');
    if (quote.numerator === '0') fail('quote_price_ZERO');
    const slippage = calculateImpact(quote, execution, 'slippage');
    return { reference, execution, result: slippage };
  }
  return { reference, execution, result };
}
function createPriceImpactObservation(input) {
  const calculation = createMeasurement({ ...input, measurement_kind: 'PRICE_IMPACT' });
  const payload = {
    measurement_kind: 'PRICE_IMPACT', measurement_version: '1', pool_ref: input.pool_ref, pool_id: input.pool.poolId,
    base_asset_ref: input.baseAssetRef, quote_asset_ref: input.quoteAssetRef, direction: input.direction,
    reference_price: calculation.reference, execution_price: calculation.execution, result: calculation.result,
    input_evidence_refs: [...input.input_evidence_refs].sort(), pre_trade_reference_evidence_ref: input.pre_trade_reference_evidence_ref,
  };
  return createSurveillanceObservation({ ...input, observation_type: 'PRICE_IMPACT', payload, rule_version: RULE_VERSIONS.PRICE_IMPACT });
}
function createSlippageObservation(input) {
  const calculation = createMeasurement({ ...input, measurement_kind: 'SLIPPAGE' });
  const payload = {
    measurement_kind: 'SLIPPAGE', measurement_version: '1', pool_ref: input.pool_ref, pool_id: input.pool.poolId,
    base_asset_ref: input.baseAssetRef, quote_asset_ref: input.quoteAssetRef, direction: input.direction,
    reference_price: calculation.reference, execution_price: calculation.execution, result: calculation.result,
    input_evidence_refs: [...input.input_evidence_refs].sort(), quote_reference: input.quote_reference,
  };
  return createSurveillanceObservation({ ...input, observation_type: 'SLIPPAGE', payload, rule_version: RULE_VERSIONS.SLIPPAGE });
}

module.exports = { DIRECTIONS, MEASUREMENT_KINDS, RULE_VERSIONS, rational, referencePrice, executionPrice, calculateImpact, createPriceImpactObservation, createSlippageObservation };