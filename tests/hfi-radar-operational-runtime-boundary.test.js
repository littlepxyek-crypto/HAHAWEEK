'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-radar-operational-runtime-verify.js', 'utf8');

test('HFI-RADAR operational runtime defaults to the official Robinhood Mainnet RPC', () => {
  assert.match(runtime, /const RPC = process\.env\.RPC_URL \|\| 'https:\/\/rpc\.mainnet\.chain\.robinhood\.com';/);
  assert.doesNotMatch(runtime, /rpc\.ordofi\.network/);
});
