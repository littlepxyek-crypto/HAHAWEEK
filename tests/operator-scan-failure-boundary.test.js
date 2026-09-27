'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('runtime scan imports its operational-state failure boundary', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'index.js'),
    'utf8'
  );

  assert.match(
    source,
    /const \{\s*classifyFailure,\s*createFailureState,\s*createHealthyState,\s*readOperationalState,\s*\} = require\('\.\/core\/operational-state'\);/s
  );
});

test('operational-state exports the scan failure boundary', () => {
  const operationalState = require('../src/core/operational-state');

  for (const name of [
    'classifyFailure',
    'createFailureState',
    'createHealthyState',
    'readOperationalState',
  ]) {
    assert.equal(typeof operationalState[name], 'function');
  }
});
