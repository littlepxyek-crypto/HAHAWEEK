'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('A7 operational runtime is bound to real-mainnet upstream evidence', () => {
  const script = fs.readFileSync(
    'scripts/hfi-radar-operational-runtime-verify.js',
    'utf8'
  );

  assert.match(script, /scripts\/hfi-mvp-runtime-verify\.js/);
  assert.match(script, /git.*rev-parse.*HEAD/);
  assert.match(script, /Robinhood Mainnet JSON-RPC/);
  assert.match(script, /external_network: true/);
  assert.match(script, /external_actions: false/);
  assert.match(script, /HFI_MVP_RUNTIME_ARTIFACT_MISSING/);
  assert.match(script, /REAL_MAINNET_AUTHORITY_NOT_VERIFIED/);
  assert.match(script, /VALIDATION_NOT_CONFIRMED/);
  assert.doesNotMatch(script, /eth_sendRawTransaction/);
  assert.match(script, /intelligenceInputs/);
  assert.match(script, /Formation, Outcome, and Validation may legitimately reference the same/);
});

test('A7 Candidate projection boundary excludes FIRST_SWAP from candidate input', () => {
  const script = fs.readFileSync(
    'scripts/hfi-radar-operational-runtime-verify.js',
    'utf8'
  );

  assert.match(script, /eventType, evidenceId, eventTime/);
  assert.match(script, /eventFromCanonical\(\s*artifact,\s*'POOL_CREATED'/);
  assert.match(script, /eventFromCanonical\(\s*artifact,\s*'LIQUIDITY_ADDED'/);
  assert.match(script, /candidate_excludes_first_swap: true/);
});


test('A7 PR runtime provenance is bound to the PR head SHA', () => {
  const workflow = fs.readFileSync('.github/workflows/hfi-radar-runtime.yml', 'utf8');
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /GITHUB_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /hfi-radar-operational-runtime-evidence-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});
