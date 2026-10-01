'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-mvp-runtime-verify.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/hfi-runtime.yml', 'utf8');

test('HFI runtime defaults to the official Robinhood Mainnet RPC', () => {
  assert.match(runtime, /rpc\.mainnet\.chain\.robinhood\.com/);
  assert.match(workflow, /RPC_URL: https:\/\/rpc-robinhood\.blockmachine\.io/);
  assert.doesNotMatch(workflow, /PUBLICNODE|API_KEY|api[_-]?key/i);
});

test('historical discovery is bounded to the minimum window needed for seven-day outcome', () => {
  assert.match(runtime, /DISCOVERY_AGE_DAYS=8/);
  assert.match(runtime, /DISCOVERY_LOOKBACK_DAYS=15/);
  assert.match(runtime, /latest-Math\.ceil\(bpd\*DISCOVERY_LOOKBACK_DAYS\)/);
  assert.match(runtime, /latest-Math\.floor\(bpd\*DISCOVERY_AGE_DAYS\)/);
});

test('RPC log acquisition backs off and preserves failure after bounded retries', () => {
  assert.match(runtime, /retries>5/);
  assert.match(runtime, /Math\.min\(5000,250\*2\*\*\(retries-1\)\)/);
});


test('runtime uses a large adaptive log range and bounded candidate pass', () => {
  assert.match(runtime, /MAXC=6/);
  assert.match(runtime, /async function logs\(p,f,a,b,s=1000000\)/);
  assert.match(runtime, /Math\.max\(1000,Math\.floor\(z\/2\)\)/);
});
