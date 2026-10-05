'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('scripts/hfi-mvp-runtime-verify.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/hfi-runtime.yml', 'utf8');

test('HFI runtime defaults to the official Robinhood Mainnet RPC', () => {
  assert.match(runtime, /rpc\.mainnet\.chain\.robinhood\.com/);
    assert.match(workflow, /RPC_URL: https:\/\/rpc\.mainnet\.chain\.robinhood\.com/);
  assert.doesNotMatch(workflow, /PUBLICNODE|API_KEY|api[_-]?key/i);
});

test('historical discovery is bounded to the minimum window needed for seven-day outcome', () => {
  assert.match(runtime, /DISCOVERY_AGE_DAYS=10/);
  assert.match(runtime, /DISCOVERY_LOOKBACK_DAYS=30/);
  assert.match(runtime, /latest-Math\.ceil\(bpd\*DISCOVERY_LOOKBACK_DAYS\)/);
  assert.match(runtime, /latest-Math\.floor\(bpd\*DISCOVERY_AGE_DAYS\)/);
});

test('RPC log acquisition has a global runtime and request budget', () => {
  assert.match(runtime, /MAX_LOG_REQUESTS=4096/);
  assert.match(runtime, /MAX_RUNTIME_MS=20\*60\*1000/);
  assert.match(runtime, /HFI_RUNTIME_RESOURCE_TIMEOUT/);
  assert.match(runtime, /HFI_LOG_REQUEST_BUDGET_EXCEEDED/);
  assert.match(runtime, /requestCount>=MAX_LOG_REQUESTS/);
});

test('RPC log acquisition uses bounded adaptive retries and range splitting', () => {
  assert.match(runtime, /while\(attempt<3\)/);
  assert.match(runtime, /const minChunk=1,maxSplitDepth=14/);
  assert.match(runtime, /if\(!isRangeLimitError\(last\)\|\|depth>=maxSplitDepth\|\|e-n\+1<=minChunk\)throw last/);
  assert.match(runtime, /fetchRange\(n,mid/);
  assert.match(runtime, /fetchRange\(mid\+1,e/);
});


test('runtime uses provider-supported bounded outcome ranges and bounded acquisition concurrency', () => {
  assert.match(runtime, /MAXC=8/);
  assert.match(runtime, /TARGET_OUTCOME_CHUNK=500/);
  assert.match(runtime, /TARGET_LOG_CONCURRENCY=16/);
  assert.match(runtime, /Math\.min\(concurrency,ranges\.length\)/);
});


test('formation and outcome acquisition retain explicit bounded windows', () => {
  assert.match(runtime, /formationEnd=Math\.min\(latest,il\.blockNumber\+10000\)/);
  assert.match(runtime, /TARGET_FORMATION_CHUNK=500/);
  assert.match(runtime, /firstSwap\.blockNumber,hi,TARGET_OUTCOME_CHUNK\)/);
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
  assert.match(runtime, /TARGET_BLOCK_BATCH_CONCURRENCY=8/);
  assert.match(runtime, /i\+=TARGET_BLOCK_BATCH_CONCURRENCY/);
  assert.match(runtime, /nums\.slice\(i,i\+TARGET_BLOCK_BATCH_CONCURRENCY\)/);
});

test('parallel acquisition is deterministically ordered before downstream interpretation', () => {
  assert.match(runtime, /out\.sort\(\(x,y\)=>/);
  assert.match(runtime, /x\.blockNumber/);
  assert.match(runtime, /x\.transactionIndex/);
  assert.match(runtime, /x\.index\?\?x\.logIndex/);
});


test('runtime preserves a terminal state when CI cancellation sends SIGTERM', () => {
  assert.match(runtime, /process\.on\('SIGTERM'/);
  assert.match(runtime, /state='CANCELLED'/);
  assert.match(runtime, /code:'RUNTIME_CANCELLED'/);
});

test('HFI runtime has a bounded completion window suitable for historical E5', () => {
  assert.match(workflow, /timeout-minutes: 45/);
});


test('resource-budget failures retain request and elapsed diagnostics', () => {
  assert.match(runtime, /e\.request_count=requestCount/);
  assert.match(runtime, /e\.elapsed_ms=Date\.now\(\)-startedAt/);
  assert.match(runtime, /request_count=\$\{e\.request_count\}/);
  assert.match(runtime, /elapsed_ms=\$\{e\.elapsed_ms\}/);
});

test('RPC transport failures do not trigger recursive range splitting', () => {
  assert.match(runtime, /function isRangeLimitError\(error\)/);
  assert.match(runtime, /if\(!isRangeLimitError\(x\)&&attempt>=3\)throw last/);
  assert.match(runtime, /if\(!isRangeLimitError\(last\)\|\|depth>=maxSplitDepth/);
});

test('range splitting is reserved for explicit eth_getLogs range/result-limit failures', () => {
  assert.doesNotMatch(runtime, /eth_getlogs\|logs\? matched/);
  assert.match(runtime, /logs\? matched\|too many logs\|too many results\|result\[s\]\? limit/);
  assert.match(runtime, /exceeds \(\?:the \)\?\(\?:maximum \)\?\(\?:block \)\?range/);
});
