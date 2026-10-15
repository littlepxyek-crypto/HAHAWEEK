'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isObservationWindowClosed } = require('../src/core/liquidity-survival-window');

const end = Date.parse('2026-01-08T00:00:00.000Z');

test('observation window is open when latest canonical block timestamp is before end', () => {
  assert.equal(isObservationWindowClosed((end - 1) / 1000, end), false);
});

test('observation window closes exactly at the configured end timestamp', () => {
  assert.equal(isObservationWindowClosed(end / 1000, end), true);
});

test('observation window is closed after the configured end timestamp', () => {
  assert.equal(isObservationWindowClosed((end + 1000) / 1000, end), true);
});

test('invalid latest block timestamp is rejected', () => {
  assert.throws(() => isObservationWindowClosed(Number.NaN, end), /INVALID_LATEST_BLOCK_TIMESTAMP/);
});

test('invalid observation end is rejected', () => {
  assert.throws(() => isObservationWindowClosed(end / 1000, Number.NaN), /INVALID_OBSERVATION_END/);
});
