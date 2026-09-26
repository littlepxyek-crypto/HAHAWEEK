'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { referencePrice, executionPrice, calculateImpact, createPriceImpactObservation, createSlippageObservation } = require('../src/core/price-impact-slippage');

const pool = { poolId: '0x' + '11'.repeat(32), currency0: '0x' + '00'.repeat(20), currency1: '0x' + '22'.repeat(20) };
const base = { pool, pool_ref: 'pool:1', baseAssetRef: pool.currency0, quoteAssetRef: pool.currency1, direction: 'BASE_TO_QUOTE', sqrtPriceX96: '79228162514264337593543950336', decimals0: 18, decimals1: 18, amount0: '1000', amount1: '500', chain_id: 4663, entity_ref: 'pool:1', evidence_refs: ['e1','e2','e3'], provenance_ref: 'prov:1', event_time: '2026-09-26T00:00:00.000Z', observation_time: '2026-09-26T00:01:00.000Z', processing_time: '2026-09-26T00:02:00.000Z', validation_status: 'OBSERVED', uncertainty: 'LOW', input_evidence_refs: ['e1','e2','e3'], pre_trade_reference_evidence_ref: 'e1', admission: { evidence_refs: ['e1','e2','e3','quote-1'], provenance_refs: ['prov:1'] } };

test('reference price is exact one-to-one at sqrtPriceX96 2^96', () => {
  const p = referencePrice(base); assert.deepEqual(p, { numerator: '1', denominator: '1' });
});

test('execution price is exact and decimal normalized', () => {
  const p = executionPrice(base); assert.deepEqual(p, { numerator: '1', denominator: '2' });
});

test('price impact is exact rational and preserves negative values', () => {
  const r = calculateImpact({ numerator: '1', denominator: '1' }, { numerator: '1', denominator: '2' }, 'price_impact');
  assert.deepEqual(r, { numerator: '1', denominator: '2' });
  const negative = calculateImpact({ numerator: '1', denominator: '1' }, { numerator: '2', denominator: '1' }, 'price_impact');
  assert.deepEqual(negative, { numerator: '-1', denominator: '1' });
});

test('price impact observation is deterministic across processing time', () => {
  const a = createPriceImpactObservation(base);
  const b = createPriceImpactObservation({ ...base, processing_time: '2026-09-26T03:00:00.000Z' });
  assert.equal(a.observation_id, b.observation_id);
  assert.deepEqual(a.payload.result, { numerator: '1', denominator: '2' });
});

test('slippage requires independent quote and computes exact result', () => {
  const input = { ...base, quote_reference: { price: { numerator: '1', denominator: '1' }, evidence_ref: 'quote-1', execution_identity: 'quote:1' } };
  const a = createSlippageObservation(input);
  assert.deepEqual(a.payload.result, { numerator: '1', denominator: '2' });
});

test('slippage rejects quote derived from same execution identity', () => {
  assert.throws(() => createSlippageObservation({ ...base, execution_identity: 'exec:1', quote_reference: { price: { numerator: '1', denominator: '1' }, evidence_ref: 'quote-1', execution_identity: 'exec:1' } }), /quote_execution_NOT_INDEPENDENT/);
});

test('zero reference, zero execution, invalid direction and unsupported pool fail closed', () => {
  assert.throws(() => calculateImpact({ numerator: '0', denominator: '1' }, { numerator: '1', denominator: '1' }, 'price_impact'), /REFERENCE_ZERO/);
  assert.throws(() => executionPrice({ ...base, amount0: '0' }), /EXECUTION_AMOUNT_ZERO/);
  assert.throws(() => createPriceImpactObservation({ ...base, direction: 'BAD' }), /direction/);
  assert.throws(() => referencePrice({ ...base, baseAssetRef: '0x' + '33'.repeat(20) }), /base_asset_ref_NOT_IN_POOL/);
});

test('input is not mutated', () => {
  const input = structuredClone(base); const before = structuredClone(input); createPriceImpactObservation(input); assert.deepEqual(input, before);
});