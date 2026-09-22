'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { detectPoolBootstrap } = require('../src/core/pool-bootstrap-formation');

const fixturePath = path.join(__dirname, 'fixtures', 'mvp-pool-bootstrap-fixtures.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('MVP fixture contract is explicitly synthetic', () => {
  assert.equal(fixture.schema_version, '1');
  assert.equal(fixture.fixture_class, 'SYNTHETIC');
  assert.equal(fixture.chain_id, 4663);
  assert.equal(fixture.formation_type, 'POOL_BOOTSTRAP');
});

test('MVP synthetic vectors produce deterministic expected formation states', () => {
  for (const vector of fixture.vectors) {
    const run = () => detectPoolBootstrap(vector.events);
    if (vector.expected_state === 'ERROR_MULTIPLE_POOL_CONTEXTS') {
      assert.throws(run, /MULTIPLE_POOL_CONTEXTS/);
    } else {
      assert.equal(run().state, vector.expected_state, vector.fixture_id);
    }
  }
});

test('synthetic fixture cannot claim authoritative evidence', () => {
  assert.notEqual(fixture.fixture_class, 'AUTHORITATIVE');
});
