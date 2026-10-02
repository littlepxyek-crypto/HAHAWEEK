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
  assert.match(script, /Robinhood Mainnet JSON-RPC/);
  assert.match(script, /external_network: true/);
  assert.match(script, /external_actions: false/);
  assert.match(script, /HFI_MVP_RUNTIME_ARTIFACT_MISSING/);
  assert.match(script, /REAL_MAINNET_AUTHORITY_NOT_VERIFIED/);
  assert.match(script, /VALIDATION_NOT_CONFIRMED/);
  assert.doesNotMatch(script, /eth_sendRawTransaction/);
});

test('A7 Candidate projection boundary excludes FIRST_SWAP from candidate input', () => {
  const script = fs.readFileSync(
    'scripts/hfi-radar-operational-runtime-verify.js',
    'utf8'
  );

  assert.match(script, /eventType, evidenceId, eventTime/);
  assert.match(script, /eventFromCanonical\\(\\s*artifact,\\s*'POOL_CREATED'/);
  assert.match(script, /eventFromCanonical\\(\\s*artifact,\\s*'LIQUIDITY_ADDED'/);
  assert.match(script, /candidate_excludes_first_swap: true/);
});
