'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-mvp-runtime-verify.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/hfi-runtime.yml', 'utf8');

test('runtime artifact is commit-bound at startup', () => {
  assert.match(runtime, /const runtimeCommit=\(\)=>/);
  assert.match(runtime, /commit:runtimeCommit\(\)/);
  assert.match(runtime, /execFileSync\('git',\['rev-parse','HEAD'\]/);
  assert.match(runtime, /runtimeBase\('RUNNING'\)/);
  assert.match(runtime, /persist\(initialBase\)/);
});

test('runtime defines analytical transition chain before replay equivalence assertion', () => {
  assert.match(runtime, /analyticalTransitions=buildAnalyticalTransitionChain\(\{formation,hypothesis,validation\}\)/);
});

test('runtime preserves stage heartbeat before expensive acquisition so watchdog failures remain diagnosable', () => {
  assert.match(runtime, /function checkpoint\(base,stage,detail=null\)/);
  assert.match(runtime, /initialBase\.stage='startup'/);
  assert.match(runtime, /checkpoint\(base,'discovery'\)/);
  assert.match(runtime, /checkpoint\(base,'formation_logs_chunk'/);
  assert.match(runtime, /base\.last_heartbeat_at=new Date\(\)\.toISOString\(\)/);
});

test('runtime log acquisition can adaptively split provider-rejected ranges with a bounded depth', () => {
  assert.match(runtime, /const minChunk=Number\(process\.env\.HFI_LOG_MIN_CHUNK \|\| 250\),maxSplitDepth=14/);
  assert.match(runtime, /const shouldSplit=isRangeLimitError\(last\)\|\|isRetryableRpcError\(last\);if\(!shouldSplit\|\|depth>=maxSplitDepth\|\|e-n\+1<=minChunk\)throw last/);
});

test('workflow removes stale artifact before runtime execution', () => {
  assert.match(workflow, /rm -f docs\/runtime\/hfi-mvp-e2e-latest\.json/);
});

test('workflow rejects runtime artifact from a different commit', () => {
  assert.match(workflow, /RUNTIME_ARTIFACT_COMMIT_MISMATCH/);
  assert.match(workflow, /x\.commit!==process\.env\.EXPECTED_COMMIT/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});
