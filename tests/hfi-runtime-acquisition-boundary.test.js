'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-mvp-runtime-verify.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/hfi-runtime.yml', 'utf8');

test('HFI runtime defaults to the official Robinhood Mainnet RPC', () => {
  assert.match(runtime, /rpc\.mainnet\.chain\.robinhood\.com/);
  assert.match(workflow, /RPC_URL: https:\/\/rpc\.ordofi\.network/);
  assert.doesNotMatch(workflow, /PUBLICNODE|API_KEY|api[_-]?key/i);
});

test('historical discovery is bounded to the minimum window needed for seven-day outcome', () => {
  assert.match(runtime, /DISCOVERY_AGE_DAYS=10/);
  assert.match(runtime, /DISCOVERY_LOOKBACK_DAYS=30/);
  assert.match(runtime, /latest-Math\.ceil\(bpd\*DISCOVERY_LOOKBACK_DAYS\)/);
  assert.match(runtime, /latest-Math\.floor\(bpd\*DISCOVERY_AGE_DAYS\)/);
});

test('RPC log acquisition backs off and preserves failure after bounded retries', () => {
  assert.match(runtime, /const retryLimit=TARGET_POOL_ID\?12:5/);
  assert.match(runtime, /const maxBackoff=TARGET_POOL_ID\?10000:5000/);
});


test('runtime uses a large adaptive log range and bounded candidate pass', () => {
  assert.match(runtime, /MAXC=8/);
  assert.match(runtime, /async function logs\(p,f,a,b,s=10000\)/);
  assert.match(runtime, /Math\.max\(1000,Math\.floor\(z\/2\)\)/);
});


test('RPC log range defaults to provider-safe 10000-block inclusive windows', () => {
  assert.match(runtime, /async function logs\(p,f,a,b,s=10000\)/);
  assert.match(runtime, /formationEnd=Math\.min\(latest,il\.blockNumber\+10000\)/);
  assert.match(runtime, /firstSwap\.blockNumber,hi,10000\)/);
});

test('runtime supports an explicit candidate hint without treating it as evidence authority', () => {
  assert.match(runtime, /HFI_POOL_ID/);
  assert.match(runtime, /HFI_POOL_INIT_BLOCK/);
  assert.match(runtime, /TARGET_POOL_INITIALIZE_NOT_FOUND/);
  assert.match(workflow, /HFI_POOL_ID:/);
  assert.match(workflow, /HFI_POOL_INIT_BLOCK:/);
});

test('targeted formation acquisition chunks below the public RPC range limit', () => {
  assert.match(runtime, /TARGET_FORMATION_CHUNK=500/);
  assert.match(runtime, /async function targetedFormationLogs/);
  assert.match(runtime, /n\+=TARGET_FORMATION_CHUNK/);
  assert.match(runtime, /TARGET_POOL_ID\?await targetedFormationLogs/);
});

test('runtime transport boundary remains read-only', () => {
  assert.doesNotMatch(runtime, /eth_sendRawTransaction|sendTransaction|Wallet\(/i);
  assert.doesNotMatch(workflow, /API_KEY|PRIVATE_KEY|SECRET/i);
});

test('targeted runtime batches historical block reads without changing event ordering', () => {
  assert.match(runtime, /TARGET_BATCH_MAX=25/);
  assert.match(runtime, /batchMaxCount:TARGET_POOL_ID\?TARGET_BATCH_MAX:1/);
});

test('runtime preserves acquisition stage and nested provider diagnostics', () => {
  assert.match(runtime, /stage='formation_logs'/);
  assert.match(runtime, /stage,error:errorText\(e\)/);
  assert.match(runtime, /e\?\.error\?\.message/);
  assert.match(runtime, /e\?\.info\?\.error\?\.message/);
});

test('targeted historical block reads cap in-flight RPC batches', () => {
  assert.match(runtime, /TARGET_BLOCK_BATCH_CONCURRENCY=4/);
  assert.match(runtime, /i\+=TARGET_BLOCK_BATCH_CONCURRENCY/);
  assert.match(runtime, /nums\.slice\(i,i\+TARGET_BLOCK_BATCH_CONCURRENCY\)/);
});

test('targeted RPC log acquisition tolerates transient provider busy responses', () => {
  assert.match(runtime, /const retryLimit=TARGET_POOL_ID\?12:5/);
  assert.match(runtime, /const maxBackoff=TARGET_POOL_ID\?10000:5000/);
});
