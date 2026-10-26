'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('CI deployment boundary is read-only and secret checks are present', () => {
  const testWorkflow = read('.github/workflows/test.yml');
  const securityWorkflow = read('.github/workflows/security.yml');
  assert.match(testWorkflow, /permissions:\s*\n\s*contents: read/);
  assert.match(securityWorkflow, /persist-credentials: false/);
  assert.match(securityWorkflow, /Potential credential material found/);
  assert.match(securityWorkflow, /Forbidden environment file is tracked/);
});

test('runtime workflows require artifact provenance and preserve failure evidence', () => {
  const hfi = read('.github/workflows/hfi-runtime.yml');
  const radar = read('.github/workflows/hfi-radar-runtime.yml');
  assert.match(hfi, /Verify runtime artifact provenance/);
  assert.match(hfi, /Upload HFI-MVP runtime evidence/);
  assert.match(radar, /Verify operational runtime artifact provenance/);
  assert.match(radar, /Upload operational runtime evidence/);
});
