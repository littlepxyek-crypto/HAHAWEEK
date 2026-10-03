'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateAcquisitionCompleteness } = require('../src/acquisition/completeness');

const base = {
  requested_start: '2026-10-03T00:00:00.000Z',
  requested_end: '2026-10-03T01:00:00.000Z',
  observed_until: '2026-10-03T01:00:00.000Z',
  terminal: true,
  failed: false,
  expired: false,
  acquisition_ids: ['acq-1'],
};

test('complete coverage permits absence interpretation', () => {
  const r = evaluateAcquisitionCompleteness(base);
  assert.equal(r.status, 'COMPLETE');
  assert.equal(r.negative_absence_permitted, true);
});

test('partial coverage never permits negative absence', () => {
  const r = evaluateAcquisitionCompleteness({
    ...base,
    observed_until: '2026-10-03T00:30:00.000Z',
    terminal: true,
  });
  assert.equal(r.status, 'PARTIAL');
  assert.equal(r.negative_absence_permitted, false);
});

test('failed acquisition never becomes complete', () => {
  const r = evaluateAcquisitionCompleteness({ ...base, failed: true });
  assert.equal(r.status, 'FAILED');
  assert.equal(r.negative_absence_permitted, false);
});

test('non-terminal acquisition is unknown', () => {
  const r = evaluateAcquisitionCompleteness({ ...base, terminal: false });
  assert.equal(r.status, 'UNKNOWN');
  assert.equal(r.negative_absence_permitted, false);
});

test('expired observation is not negative evidence', () => {
  const r = evaluateAcquisitionCompleteness({ ...base, terminal: false, expired: true });
  assert.equal(r.status, 'EXPIRED');
  assert.equal(r.negative_absence_permitted, false);
});
