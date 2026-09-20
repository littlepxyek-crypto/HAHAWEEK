'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine } = require('../src/index');

test('default production createEngine remains on the legacy cursor boundary until V4 cutover is authorized', () => {
  assert.equal(typeof createEngine, 'function');
  const source = createEngine.toString();
  assert.match(source, /new BlockCursor\(\)/);
  assert.doesNotMatch(source, /createV4ProductionIngestionEngine/);
  assert.doesNotMatch(source, /v4CursorAdapter/);
});
