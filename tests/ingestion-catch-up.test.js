'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { readConfig, DEFAULTS, DEFAULT_RPC_URL } = require('../src/core/config');
const { redactUrl, redactText } = require('../src/core/redact');
const { IngestionEngine } = require('../src/core/ingestion');
const { fetchHeadersInOrder } = require('../src/core/canonical-decision-input');
const { runRunner, nextSleepMs, EXIT_FAIL_CLOSED } = require('../src/runner');

/* ---------------- config ---------------- */

test('config defaults are sized for a ~10 blocks/s chain', () => {
  const config = readConfig({});
  assert.equal(config.RPC_URL, DEFAULT_RPC_URL);
  assert.deepEqual(config.RPC_URLS, [DEFAULT_RPC_URL]);
  assert.equal(config.CHAIN_ID, 4663);
  assert.equal(config.CHUNK_SIZE, DEFAULTS.CHUNK_SIZE);
  assert.equal(config.LOG_CHUNK_SIZE, DEFAULTS.CHUNK_SIZE);
  assert.equal(config.MAX_BATCHES_PER_RUN, DEFAULTS.MAX_BATCHES_PER_RUN);
  assert.ok(config.CHUNK_SIZE * config.MAX_BATCHES_PER_RUN >= 5000);
  assert.equal(config.HEADER_CONCURRENCY, DEFAULTS.HEADER_CONCURRENCY);
  assert.equal(config.START_BLOCK, null);
});

test('HAHAWEEK_* variables take precedence over legacy names', () => {
  const config = readConfig({
    HAHAWEEK_RPC_URL: 'https://keyed.example/v2/SECRET',
    RPC_URL: 'https://legacy.example',
    HAHAWEEK_CHUNK_SIZE: '2000',
    CHUNK_SIZE: '10',
    HAHAWEEK_MAX_BATCHES_PER_RUN: '5',
    MAX_BATCHES_PER_RUN: '10',
    HAHAWEEK_LOG_CHUNK_SIZE: '1000',
    HAHAWEEK_HEADER_CONCURRENCY: '16',
    HAHAWEEK_START_BLOCK: '59281988',
  });
  assert.equal(config.RPC_URL, 'https://keyed.example/v2/SECRET');
  assert.equal(config.CHUNK_SIZE, 2000);
  assert.equal(config.MAX_BATCHES_PER_RUN, 5);
  assert.equal(config.LOG_CHUNK_SIZE, 1000);
  assert.equal(config.HEADER_CONCURRENCY, 16);
  assert.equal(config.START_BLOCK, 59281988);
});

test('legacy variable names still work', () => {
  const config = readConfig({ RPC_URL: 'https://legacy.example', CHUNK_SIZE: '10', MAX_BATCHES_PER_RUN: '10' });
  assert.equal(config.RPC_URL, 'https://legacy.example');
  assert.equal(config.CHUNK_SIZE, 10);
  assert.equal(config.LOG_CHUNK_SIZE, 10);
  assert.equal(config.MAX_BATCHES_PER_RUN, 10);
});

test('invalid numeric config fails closed', () => {
  assert.throws(() => readConfig({ HAHAWEEK_CHUNK_SIZE: '0' }), /INVALID_CONFIG: HAHAWEEK_CHUNK_SIZE/);
  assert.throws(() => readConfig({ HAHAWEEK_CHUNK_SIZE: 'abc' }), /INVALID_CONFIG/);
  assert.throws(() => readConfig({ HAHAWEEK_START_BLOCK: '-1' }), /INVALID_CONFIG: HAHAWEEK_START_BLOCK/);
  assert.equal(readConfig({ HAHAWEEK_START_BLOCK: '' }).START_BLOCK, null);
  assert.equal(readConfig({ HAHAWEEK_START_BLOCK: '0' }).START_BLOCK, 0);
});

/* ---------------- redaction ---------------- */

test('redactUrl keeps scheme and host only when a key could be present', () => {
  assert.equal(redactUrl('https://rpc.mainnet.chain.robinhood.com'), 'https://rpc.mainnet.chain.robinhood.com');
  assert.equal(redactUrl('https://rpc.mainnet.chain.robinhood.com/'), 'https://rpc.mainnet.chain.robinhood.com/');
  assert.equal(redactUrl('https://robinhood-mainnet.g.alchemy.com/v2/abcKEY123'), 'https://robinhood-mainnet.g.alchemy.com/redacted');
  assert.equal(redactUrl('https://rpc.example.com?apikey=SECRET'), 'https://rpc.example.com/redacted');
  assert.equal(redactUrl('https://user:pass@rpc.example.com'), 'https://rpc.example.com/redacted');
  assert.equal(redactUrl('wss://rpc.example.com:8546/ws/KEY'), 'wss://rpc.example.com:8546/redacted');
  assert.equal(redactUrl('not a url KEY'), '[redacted]');
});

test('redactText removes keyed URLs from error messages', () => {
  const keyed = 'https://robinhood-mainnet.g.alchemy.com/v2/abcKEY123';
  const message = `server response 429 (request={ }, info={ "requestUrl": "${keyed}" })`;
  const out = redactText(message, [keyed]);
  assert.doesNotMatch(out, /abcKEY123/);
  assert.match(out, /alchemy\.com\/redacted/);
  assert.doesNotMatch(redactText(`fetch failed ${'https://x.example/key/SECRET'}`), /SECRET/);
});

/* ---------------- start block / backfill ---------------- */

function makeCursor(initial = null) {
  let value = initial;
  return { get: () => value, initialize: b => (value = b), advance: b => (value = b) };
}

function makeEngine({ cursor, head, startBlock, batchSize = 10, maxBatchesPerRun, ranges, authority = () => ({ status: 'AUTHORIZED' }) }) {
  return new IngestionEngine({
    authorityGate: authority,
    provider: { getBlockNumber: async () => head },
    cursor,
    confirmations: 3,
    processor: async () => { throw new Error('SINGLE_BLOCK_PROCESSOR_SHOULD_NOT_RUN'); },
    processorRange: async (fromBlock, toBlock) => {
      ranges.push([fromBlock, toBlock]);
      return { status: 'VERIFIED', fromBlock, toBlock, generation: '1' };
    },
    batchSize,
    maxBatchesPerRun,
    startBlock,
  });
}

test('start block is used when no cursor exists and goes through the authority gate', async () => {
  const ranges = [];
  const authorityInputs = [];
  const cursor = makeCursor(null);
  const engine = makeEngine({
    cursor,
    head: 1003,
    startBlock: 950,
    batchSize: 20,
    ranges,
    authority: input => { authorityInputs.push([input.fromBlock, input.toBlock]); return { status: 'AUTHORIZED' }; },
  });

  const result = await engine.runOnce();

  assert.deepEqual(ranges, [[950, 969], [970, 989], [990, 1000]]);
  assert.deepEqual(authorityInputs, ranges);
  assert.equal(result.cursor, 1000);
  assert.equal(result.behind, 0);
});

test('start block is ignored once a cursor exists', async () => {
  const ranges = [];
  const engine = makeEngine({ cursor: makeCursor(995), head: 1003, startBlock: 10, ranges });
  await engine.runOnce();
  assert.deepEqual(ranges, [[996, 1000]]);
});

test('start block above the safe head waits without processing', async () => {
  const ranges = [];
  const cursor = makeCursor(null);
  const engine = makeEngine({ cursor, head: 1003, startBlock: 5000, ranges });
  const result = await engine.runOnce();
  assert.deepEqual(ranges, []);
  assert.equal(result.processed, 0);
  assert.equal(cursor.get(), null);
});

test('start block does not advance the cursor when authority rejects', async () => {
  const ranges = [];
  const cursor = makeCursor(null);
  const engine = makeEngine({ cursor, head: 1003, startBlock: 900, ranges, authority: () => ({ status: 'REJECTED' }) });
  await assert.rejects(() => engine.runOnce(), /AUTHORITY_ACCEPTANCE_REQUIRED/);
  assert.equal(cursor.get(), null);
});

test('batch cap reports how far the cursor is behind the safe head', async () => {
  const ranges = [];
  const engine = makeEngine({ cursor: makeCursor(0), head: 10003, batchSize: 100, maxBatchesPerRun: 3, ranges });
  const result = await engine.runOnce();
  assert.equal(result.cursor, 300);
  assert.equal(result.behind, 10000 - 300);
});

test('invalid start block is rejected at construction', () => {
  assert.throws(() => makeEngine({ cursor: makeCursor(), head: 10, startBlock: -5, ranges: [] }), /INVALID_START_BLOCK/);
});

/* ---------------- header fetching ---------------- */

test('headers are fetched with bounded concurrency and returned in block order', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const waves = [];
  const provider = {
    getBlock: async number => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, (number * 7) % 5));
      inFlight -= 1;
      return { number };
    },
  };

  const headers = await fetchHeadersInOrder({
    provider,
    fromBlock: 100,
    toBlock: 122,
    concurrency: 4,
    beforeWave: () => waves.push(true),
  });

  assert.deepEqual(headers.map(h => h.number), Array.from({ length: 23 }, (_, i) => 100 + i));
  assert.ok(maxInFlight <= 4);
  assert.equal(waves.length, 6);
});

test('header fetch rejects invalid concurrency and propagates RPC errors', async () => {
  await assert.rejects(
    () => fetchHeadersInOrder({ provider: { getBlock: async () => ({}) }, fromBlock: 1, toBlock: 2, concurrency: 0 }),
    /INVALID_HEADER_CONCURRENCY/
  );
  await assert.rejects(
    () => fetchHeadersInOrder({
      provider: { getBlock: async n => { if (n === 3) throw new Error('RPC_DOWN'); return { number: n }; } },
      fromBlock: 1,
      toBlock: 5,
      concurrency: 2,
    }),
    /RPC_DOWN/
  );
});

test('header fetch stops before the next wave when the writer fence is lost', async () => {
  const fetched = [];
  let waves = 0;
  await assert.rejects(
    () => fetchHeadersInOrder({
      provider: { getBlock: async n => { fetched.push(n); return { number: n }; } },
      fromBlock: 1,
      toBlock: 10,
      concurrency: 3,
      beforeWave: () => { waves += 1; if (waves === 2) throw new Error('WRITER_FENCE_LOST'); },
    }),
    /WRITER_FENCE_LOST/
  );
  assert.deepEqual(fetched, [1, 2, 3]);
});

/* ---------------- runner loop ---------------- */

const healthy = cursor => ({
  version: 1,
  status: 'IDLE',
  operationalState: 'HEALTHY',
  lastProcessedBlock: cursor,
  lastVerifiedCursor: cursor,
  failure: null,
  recovery: { state: 'NOT_REQUIRED', required: false },
});

test('runner sleeps briefly while behind and normally once caught up', async () => {
  let cursor = 0;
  const advances = [1000, 1000, 10];
  const sleeps = [];
  const result = await runRunner({
    intervalMs: 5000,
    catchUpSleepMs: 250,
    passBlocks: 1000,
    output: () => {},
    runCycle: async () => { cursor += advances.shift(); },
    getState: () => healthy(cursor),
    sleepFn: async ms => { sleeps.push(ms); },
    maxCycles: 3,
  });
  assert.equal(result.outcome, 'MAX_CYCLES');
  assert.deepEqual(sleeps, [250, 250, 5000]);
});

test('nextSleepMs treats an unknown cursor as caught up', () => {
  assert.equal(nextSleepMs({ before: 5, after: null, passBlocks: 10, intervalMs: 5000, catchUpSleepMs: 100 }), 5000);
  assert.equal(nextSleepMs({ before: 5, after: 8, passBlocks: 10, intervalMs: 5000, catchUpSleepMs: 100 }), 5000);
  assert.equal(nextSleepMs({ before: 5, after: 15, passBlocks: 10, intervalMs: 5000, catchUpSleepMs: 100 }), 100);
});

test('runner retries a retryable failure and stops fail-closed on a blocked state', async () => {
  const sleeps = [];
  let calls = 0;
  const states = [
    { ...healthy(10), operationalState: 'DEGRADED', failure: { failure_class: 'PROVIDER_UNAVAILABLE' } },
    { ...healthy(10), operationalState: 'BLOCKED', failure: { failure_class: 'AUTHORITY_MISMATCH' } },
  ];
  let current = healthy(10);
  const result = await runRunner({
    intervalMs: 1000,
    maxBackoffMs: 4000,
    output: () => {},
    runCycle: async () => {
      calls += 1;
      current = states.shift();
      throw new Error('COMMAND_FAILED');
    },
    getState: () => current,
    sleepFn: async ms => { sleeps.push(ms); },
  });
  assert.equal(result.outcome, 'FAIL_CLOSED');
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1000]);
  assert.equal(EXIT_FAIL_CLOSED, 78);
});

test('runner in hold mode runs no further cycles after a fail-closed stop', async () => {
  let calls = 0;
  let holdSleeps = 0;
  await assert.rejects(
    () => runRunner({
      intervalMs: 1000,
      onStop: 'hold',
      output: () => {},
      runCycle: async () => { calls += 1; throw new Error('COMMAND_FAILED'); },
      getState: () => ({ ...healthy(10), operationalState: 'BLOCKED', failure: { failure_class: 'AUTHORITY_MISMATCH' } }),
      sleepFn: async () => {
        holdSleeps += 1;
        if (holdSleeps === 3) throw new Error('HOLD_PROBE');
      },
    }),
    /HOLD_PROBE/
  );
  assert.equal(calls, 1);
  assert.equal(holdSleeps, 3);
});

test('runner redacts keyed URLs in cycle failure output', async () => {
  const lines = [];
  await runRunner({
    output: line => lines.push(line),
    runCycle: async () => { throw new Error('fetch failed https://rpc.example.com/v2/SECRETKEY'); },
    getState: () => ({ ...healthy(1), operationalState: 'BLOCKED', failure: { failure_class: 'AUTHORITY_MISMATCH' } }),
    sleepFn: async () => {},
  });
  assert.ok(lines.some(line => line.includes('rpc.example.com/redacted')));
  assert.ok(lines.every(line => !line.includes('SECRETKEY')));
});
