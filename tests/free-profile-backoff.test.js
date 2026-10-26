'use strict';

/*
 * Offline tests for the free/fast profiles, RPC backoff + jitter, Retry-After
 * handling, the retrying provider transport (against a local HTTP server on
 * 127.0.0.1) and the one-pass fail-closed gate. No public RPC is contacted.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { readConfig, PROFILES, DEFAULT_PROFILE } = require('../src/core/config');
const {
  classifyRpcError,
  parseRetryAfter,
  computeBackoffDelay,
  withBackoff,
  assertNoRateLimitResult,
} = require('../src/core/rpc-backoff');
const { rpcCall } = require('../src/core/rpc-call');
const { createProvider } = require('../src/core/rpc');
const { classifyFailure } = require('../src/core/operational-state');
const { decidePass, runPass, EXIT_FAIL_CLOSED } = require('../src/pass');

/* ---------------- profiles ---------------- */

test('default profile is free', () => {
  assert.equal(DEFAULT_PROFILE, 'free');
  assert.equal(readConfig({}).PROFILE, 'free');
});

test('free profile is lighter than fast on every RPC-pressure knob', () => {
  const free = readConfig({ HAHAWEEK_PROFILE: 'free' });
  const fast = readConfig({ HAHAWEEK_PROFILE: 'fast' });
  assert.ok(free.LOG_CHUNK_SIZE < fast.LOG_CHUNK_SIZE);
  assert.ok(free.CHUNK_SIZE < fast.CHUNK_SIZE);
  assert.ok(free.HEADER_CONCURRENCY <= 2);
  assert.ok(free.MAX_BATCHES_PER_RUN < fast.MAX_BATCHES_PER_RUN);
  assert.ok(free.MAX_RPC_CALLS_PER_RUN < fast.MAX_RPC_CALLS_PER_RUN);
  assert.ok(free.LOOP_SLEEP_MS > fast.LOOP_SLEEP_MS);
  assert.ok(free.CATCHUP_SLEEP_MS > fast.CATCHUP_SLEEP_MS);
  assert.ok(free.RPC_RETRY_BASE_MS > fast.RPC_RETRY_BASE_MS);
  assert.ok(free.RPC_RETRY_MAX_ATTEMPTS >= fast.RPC_RETRY_MAX_ATTEMPTS);
});

test('free getLogs range stays far below the public RPC 10,000-log cap', () => {
  // Probe 2026-10-26: ~1.1 PoolManager logs per block.
  assert.ok(PROFILES.free.LOG_CHUNK_SIZE * 1.1 * 10 < 10000);
});

test('profile name is case-insensitive and validated', () => {
  assert.equal(readConfig({ HAHAWEEK_PROFILE: 'FAST' }).PROFILE, 'fast');
  assert.throws(() => readConfig({ HAHAWEEK_PROFILE: 'turbo' }), /INVALID_CONFIG: HAHAWEEK_PROFILE/);
});

test('explicit env vars override profile values', () => {
  const config = readConfig({
    HAHAWEEK_PROFILE: 'free',
    HAHAWEEK_HEADER_CONCURRENCY: '4',
    HAHAWEEK_MAX_BATCHES_PER_RUN: '9',
    HAHAWEEK_LOOP_SLEEP_MS: '1234',
    HAHAWEEK_RPC_RETRY_MAX_ATTEMPTS: '2',
  });
  assert.equal(config.HEADER_CONCURRENCY, 4);
  assert.equal(config.MAX_BATCHES_PER_RUN, 9);
  assert.equal(config.LOOP_SLEEP_MS, 1234);
  assert.equal(config.RPC_RETRY_MAX_ATTEMPTS, 2);
  assert.equal(config.CHUNK_SIZE, PROFILES.free.CHUNK_SIZE);
});

test('explicit CHUNK_SIZE keeps log range = batch size; otherwise profile log range', () => {
  assert.equal(readConfig({ HAHAWEEK_CHUNK_SIZE: '300' }).LOG_CHUNK_SIZE, 300);
  assert.equal(readConfig({ HAHAWEEK_PROFILE: 'free' }).LOG_CHUNK_SIZE, PROFILES.free.LOG_CHUNK_SIZE);
});

test('retry max below retry base is rejected', () => {
  assert.throws(
    () => readConfig({ HAHAWEEK_RPC_RETRY_BASE_MS: '5000', HAHAWEEK_RPC_RETRY_MAX_MS: '100' }),
    /HAHAWEEK_RPC_RETRY_MAX_MS/
  );
});

test('legacy RUNNER_INTERVAL_MS still sets the loop sleep', () => {
  assert.equal(readConfig({ RUNNER_INTERVAL_MS: '777' }).LOOP_SLEEP_MS, 777);
});

/* ---------------- classification ---------------- */

test('429, 5xx, timeouts and network errors are retryable', () => {
  assert.equal(classifyRpcError({ response: { statusCode: 429, headers: {} } }).reason, 'HTTP_429');
  assert.equal(classifyRpcError({ info: { response: { statusCode: 503, headers: {} } } }).reason, 'HTTP_503');
  assert.equal(classifyRpcError({ code: 'TIMEOUT', message: 'timeout' }).reason, 'TIMEOUT');
  assert.equal(classifyRpcError({ message: 'read ECONNRESET' }).reason, 'NETWORK');
  assert.equal(classifyRpcError({ error: { code: -32005, message: 'x' } }).reason, 'RPC_RATE_LIMIT');
  assert.equal(classifyRpcError({ message: 'Too Many Requests' }).retryable, true);
});

test('non-transient errors are not retried', () => {
  assert.equal(classifyRpcError({ message: 'logs matched by query exceeds limit of 10000' }).retryable, false);
  assert.equal(classifyRpcError({ response: { statusCode: 400, headers: {} } }).retryable, false);
  assert.equal(classifyRpcError(new Error('CHAIN_ID_MISMATCH')).retryable, false);
});

test('Retry-After: delta seconds and HTTP-date', () => {
  assert.equal(parseRetryAfter('3'), 3000);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter('soon'), null);
  const now = Date.parse('2026-10-26T00:00:00Z');
  assert.equal(parseRetryAfter('Mon, 26 Oct 2026 00:00:10 GMT', now), 10000);
  assert.equal(parseRetryAfter('Mon, 26 Oct 2026 00:00:00 GMT', now + 5000), 0);
  assert.equal(
    classifyRpcError({ response: { statusCode: 429, headers: { 'Retry-After': '2' } } }).retryAfterMs,
    2000
  );
});

/* ---------------- backoff math ---------------- */

test('backoff grows exponentially, is capped, and jitters within [exp/2, exp]', () => {
  const lo = a => computeBackoffDelay({ attempt: a, baseDelayMs: 1000, maxDelayMs: 60000, random: () => 0 });
  const hi = a => computeBackoffDelay({ attempt: a, baseDelayMs: 1000, maxDelayMs: 60000, random: () => 1 });
  assert.deepEqual([1, 2, 3, 4].map(hi), [1000, 2000, 4000, 8000]);
  assert.deepEqual([1, 2, 3, 4].map(lo), [500, 1000, 2000, 4000]);
  assert.equal(hi(20), 60000);
  assert.equal(lo(20), 30000);
  const mid = computeBackoffDelay({ attempt: 3, baseDelayMs: 1000, maxDelayMs: 60000, random: () => 0.5 });
  assert.ok(mid > 2000 && mid < 4000);
});

test('backoff rejects invalid inputs', () => {
  assert.throws(() => computeBackoffDelay({ attempt: 0, baseDelayMs: 1, maxDelayMs: 1 }), /INVALID_ATTEMPT/);
  assert.throws(() => computeBackoffDelay({ attempt: 1, baseDelayMs: -1, maxDelayMs: 1 }), /INVALID_BASE_DELAY/);
  assert.throws(() => computeBackoffDelay({ attempt: 1, baseDelayMs: 10, maxDelayMs: 1 }), /INVALID_MAX_DELAY/);
});

/* ---------------- withBackoff ---------------- */

function http429(retryAfter) {
  const error = new Error('429 Too Many Requests');
  error.response = { statusCode: 429, headers: retryAfter === undefined ? {} : { 'retry-after': retryAfter } };
  return error;
}

test('withBackoff retries transient failures then succeeds', async () => {
  const sleeps = [];
  let calls = 0;
  const result = await withBackoff(async () => {
    calls += 1;
    if (calls === 1) throw http429();
    if (calls === 2) throw Object.assign(new Error('timeout'), { code: 'TIMEOUT' });
    return 'ok';
  }, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, random: () => 1, sleep: ms => { sleeps.push(ms); } });
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [100, 200]);
});

test('withBackoff honours Retry-After instead of the computed delay', async () => {
  const sleeps = [];
  let calls = 0;
  await withBackoff(async () => {
    calls += 1;
    if (calls === 1) throw http429('3');
    return 'ok';
  }, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 10000, random: () => 0, sleep: ms => { sleeps.push(ms); } });
  assert.deepEqual(sleeps, [3000]);
});

test('Retry-After longer than the cap: give up at once, do not hammer', async () => {
  let calls = 0;
  const sleeps = [];
  await assert.rejects(
    withBackoff(async () => { calls += 1; throw http429('3600'); },
      { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 60000, sleep: ms => { sleeps.push(ms); } }),
    error => error.code === 'RPC_UNAVAILABLE' && /RETRY_AFTER_TOO_LONG/.test(error.reason)
  );
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('withBackoff does not retry non-transient errors', async () => {
  let calls = 0;
  await assert.rejects(
    withBackoff(async () => { calls += 1; throw new Error('logs matched by query exceeds limit of 10000'); },
      { maxAttempts: 5, baseDelayMs: 0, maxDelayMs: 0, sleep: () => {} }),
    /exceeds limit/
  );
  assert.equal(calls, 1);
});

test('exhausted retries surface RPC_UNAVAILABLE, classified retryable', async () => {
  let calls = 0;
  let caught;
  try {
    await withBackoff(async () => { calls += 1; throw http429(); },
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, sleep: () => {} });
  } catch (error) {
    caught = error;
  }
  assert.equal(calls, 3);
  assert.equal(caught.code, 'RPC_UNAVAILABLE');
  assert.equal(caught.hahaweekRetryExhausted, true);
  assert.ok(caught.cause);
  const failure = classifyFailure(caught);
  assert.equal(failure.failure_class, 'PROVIDER_UNAVAILABLE');
  assert.equal(failure.retry_policy, 'RETRY');
  assert.equal(failure.authority_impact, 'UNCHANGED');
});

test('rpcCall does not multiply attempts after the transport gave up', async () => {
  let calls = 0;
  const exhaustedError = Object.assign(new Error('RPC_UNAVAILABLE'), {
    code: 'RPC_UNAVAILABLE', hahaweekRetryExhausted: true,
  });
  await assert.rejects(
    rpcCall(async () => { calls += 1; throw exhaustedError; }, { maxAttempts: 3, baseDelayMs: 0 }),
    /RPC_UNAVAILABLE/
  );
  assert.equal(calls, 1);
});

test('JSON-RPC rate-limit error inside a 200 body is raised for retry', () => {
  assert.throws(
    () => assertNoRateLimitResult([{ id: 1, error: { code: -32005, message: 'limit' } }]),
    error => classifyRpcError(error).retryable
  );
  const ok = [{ id: 1, result: '0x1' }, { id: 2, error: { code: -32000, message: 'execution reverted' } }];
  assert.equal(assertNoRateLimitResult(ok), ok);
});

/* ---------------- provider transport against a local server ---------------- */

function startServer(handler) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => handler(JSON.parse(body), res));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function reply(res, payload) {
  const one = p => ({ jsonrpc: '2.0', id: p.id, result: p.method === 'eth_chainId' ? '0x1237' : '0x2a' });
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(Array.isArray(payload) ? payload.map(one) : one(payload)));
}

test('provider retries 429 (Retry-After) and 503 transparently', async () => {
  let n = 0;
  const server = await startServer((payload, res) => {
    n += 1;
    if (n === 1) { res.writeHead(429, { 'retry-after': '0' }); res.end('slow down'); return; }
    if (n === 2) { res.writeHead(503); res.end('busy'); return; }
    reply(res, payload);
  });
  const sleeps = [];
  const retries = [];
  const provider = createProvider({
    url: `http://127.0.0.1:${server.address().port}`,
    retry: {
      maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 5,
      sleep: async ms => { sleeps.push(ms); },
      onRetry: info => retries.push(info.reason),
    },
  });
  try {
    assert.equal(await provider.getBlockNumber(), 42);
    assert.deepEqual(retries.slice(0, 2), ['HTTP_429', 'HTTP_503']);
    assert.equal(sleeps[0], 0); // Retry-After: 0 honoured
  } finally {
    provider.destroy();
    server.close();
  }
});

test('provider gives up with RPC_UNAVAILABLE after maxAttempts', async () => {
  let n = 0;
  const server = await startServer((payload, res) => {
    n += 1;
    res.writeHead(502);
    res.end('bad gateway');
  });
  const provider = createProvider({
    url: `http://127.0.0.1:${server.address().port}`,
    retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, sleep: async () => {}, onRetry: () => {} },
  });
  try {
    await assert.rejects(provider.getBlockNumber(), error =>
      error.code === 'RPC_UNAVAILABLE' || error?.cause?.code === 'RPC_UNAVAILABLE' ||
      /RPC_UNAVAILABLE/.test(String(error?.message)));
    assert.ok(n >= 3);
  } finally {
    provider.destroy();
    server.close();
  }
});

/* ---------------- one-pass fail-closed gate ---------------- */

const blocked = {
  operationalState: 'BLOCKED',
  failure: { failure_class: 'AUTHORITY_MISMATCH', failure_code: 'AUTHORITY_BINDING_INVALID' },
};
const degraded = {
  operationalState: 'DEGRADED',
  failure: { failure_class: 'PROVIDER_UNAVAILABLE', failure_code: 'RPC_UNAVAILABLE' },
};

test('decidePass: runs fresh/healthy/retryable, stops on non-retryable', () => {
  assert.equal(decidePass({ lastProcessedBlock: null }).run, true);
  assert.equal(decidePass({ operationalState: 'HEALTHY', failure: null }).run, true);
  assert.equal(decidePass(degraded).run, true);
  assert.equal(decidePass(blocked).run, false);
  assert.equal(decidePass(blocked, { resumeAfterStop: true }).run, true);
  assert.equal(decidePass({ operationalState: 'NOPE' }).run, false);
});

test('runPass: STOP exits 78 without running the pass', async () => {
  let ran = false;
  const code = await runPass({
    argv: [], getState: () => blocked, runMain: async () => { ran = true; },
    output: () => {}, errorOutput: () => {},
  });
  assert.equal(code, EXIT_FAIL_CLOSED);
  assert.equal(ran, false);
});

test('runPass: retryable provider failure exits 0 with a warning, other failures exit 1', async () => {
  const lines = [];
  let state = { operationalState: 'HEALTHY', failure: null };
  const code = await runPass({
    argv: [],
    getState: () => state,
    runMain: async () => { state = degraded; throw new Error('RPC_UNAVAILABLE'); },
    output: line => lines.push(line), errorOutput: () => {},
  });
  assert.equal(code, 0);
  assert.ok(lines.some(line => line.startsWith('::warning::')));

  state = { operationalState: 'HEALTHY', failure: null };
  const code2 = await runPass({
    argv: [],
    getState: () => state,
    runMain: async () => { state = blocked; throw new Error('AUTHORITY_BINDING_INVALID'); },
    output: () => {}, errorOutput: () => {},
  });
  assert.equal(code2, 1);
});

test('runPass: --resume-after-stop runs the pass', async () => {
  let ran = false;
  const code = await runPass({
    argv: ['--resume-after-stop'], getState: () => blocked, runMain: async () => { ran = true; },
    output: () => {}, errorOutput: () => {},
  });
  assert.equal(code, 0);
  assert.equal(ran, true);
});
