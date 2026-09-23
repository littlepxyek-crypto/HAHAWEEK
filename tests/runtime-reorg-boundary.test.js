'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { RESULTS, evaluateRuntimeBoundary } = require('../src/core/runtime-reorg-boundary');
const previous = { chainId: 4663, blockNumber: 100, blockHash: '0x100', parentHash: '0x099', observedAt: '2026-09-21T00:00:00.000Z' };

test('continuous block permits runtime continuation', () => { const current = { ...previous, blockNumber: 101, blockHash: '0x101', parentHash: '0x100' }; assert.deepEqual(evaluateRuntimeBoundary({ previous, current }), { result: RESULTS.CONTINUE, detectorResult: 'CONTINUOUS' }); });
test('reorg detection stops runtime before cursor advancement', () => { const current = { ...previous, blockNumber: 101, blockHash: '0x101-fork', parentHash: '0x0ff' }; assert.deepEqual(evaluateRuntimeBoundary({ previous, current }), { result: RESULTS.STOP_REORG, detectorResult: 'REORG_DETECTED' }); });
test('invalid input fails closed', () => { const current = { ...previous, blockNumber: 103, blockHash: '0x103', parentHash: '0x102' }; assert.deepEqual(evaluateRuntimeBoundary({ previous, current }), { result: RESULTS.FAIL_CLOSED, detectorResult: 'INVALID_INPUT' }); });
test('missing identities fail closed', () => { assert.deepEqual(evaluateRuntimeBoundary({ previous, current: null }), { result: RESULTS.FAIL_CLOSED, detectorResult: 'INVALID_INPUT' }); });
test('boundary is pure and does not mutate inputs', () => { const current = { ...previous, blockNumber: 101, blockHash: '0x101-fork', parentHash: '0x0ff' }; const a = JSON.stringify(previous), b = JSON.stringify(current); evaluateRuntimeBoundary({ previous, current }); assert.equal(JSON.stringify(previous), a); assert.equal(JSON.stringify(current), b); });
