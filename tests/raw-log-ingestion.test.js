'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RawLogIngestion,
} = require('../src/core/raw-log-ingestion');

function makeLog(blockNumber, transactionHash, index = 0) {
  return {
    blockNumber,
    transactionHash,
    index,
    address: '0x0000000000000000000000000000000000000001',
    topics: ['0xtopic'],
    data: '0x',
  };
}

test('raw log ingestion queries ranges in chunks', async () => {
  const calls = [];
  const stored = [];

  const provider = {
    async getLogs(filter) {
      calls.push(filter);

      return [
        makeLog(
          filter.fromBlock,
          `0x${String(filter.fromBlock).padStart(64, '0')}`
        ),
      ];
    },
  };

  const appendUnique = (log, chainId) => {
    stored.push({ log, chainId });

    return {
      inserted: true,
      eventId: `${chainId}:${log.blockNumber}:${log.transactionHash}:${log.index}`,
    };
  };

  const ingestion = new RawLogIngestion({
    provider,
    appendUnique,
    chainId: 4663,
    chunkSize: 2,
  });

  const result = await ingestion.ingestRange(100, 104);

  assert.deepEqual(
    calls.map((call) => [
      call.fromBlock,
      call.toBlock,
    ]),
    [
      [100, 101],
      [102, 103],
      [104, 104],
    ]
  );

  assert.equal(result.fetched, 3);
  assert.equal(result.inserted, 3);
  assert.equal(result.duplicates, 0);
  assert.equal(stored.length, 3);
});

test('duplicate raw logs are counted without reinsertion', async () => {
  const seen = new Set();

  const log = makeLog(
    200,
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    7
  );

  const provider = {
    async getLogs() {
      return [log];
    },
  };

  const appendUnique = (value, chainId) => {
    const id = [
      chainId,
      value.blockNumber,
      value.transactionHash,
      value.index,
    ].join(':');

    if (seen.has(id)) {
      return {
        inserted: false,
        eventId: id,
      };
    }

    seen.add(id);

    return {
      inserted: true,
      eventId: id,
    };
  };

  const ingestion = new RawLogIngestion({
    provider,
    appendUnique,
    chainId: 4663,
    chunkSize: 10,
  });

  const first = await ingestion.ingestRange(200, 200);
  const second = await ingestion.ingestRange(200, 200);

  assert.equal(first.inserted, 1);
  assert.equal(first.duplicates, 0);

  assert.equal(second.inserted, 0);
  assert.equal(second.duplicates, 1);
});

test('raw log ingestion preserves RPC failures', async () => {
  const provider = {
    async getLogs() {
      throw new Error('RPC_LOG_FAILURE');
    },
  };

  const ingestion = new RawLogIngestion({
    provider,
    appendUnique: () => ({
      inserted: true,
      eventId: 'unused',
    }),
    chainId: 4663,
  });

  await assert.rejects(
    () => ingestion.ingestRange(300, 300),
    {
      message: 'RPC_LOG_FAILURE',
    }
  );
});
