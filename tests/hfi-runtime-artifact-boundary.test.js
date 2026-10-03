'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-mvp-runtime-verify.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/hfi-runtime.yml', 'utf8');

test('runtime artifact is commit-bound at startup', () => {
  assert.match(runtime, /commit:process\.env\.GITHUB_SHA\|\|'UNKNOWN'/);
  assert.match(runtime, /runtimeBase\('RUNNING'\)/);
  assert.match(runtime, /persist\(initialBase\)/);
});

test('workflow removes stale artifact before runtime execution', () => {
  assert.match(workflow, /rm -f docs\/runtime\/hfi-mvp-e2e-latest\.json/);
});

test('workflow rejects runtime artifact from a different commit', () => {
  assert.match(workflow, /RUNTIME_ARTIFACT_COMMIT_MISMATCH/);
  assert.match(workflow, /x\.commit!==process\.env\.EXPECTED_COMMIT/);\n  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});
