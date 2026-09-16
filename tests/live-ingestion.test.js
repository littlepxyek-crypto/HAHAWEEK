'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createProvider } = require('../src/core/rpc');
const { IngestionEngine } = require('../src/core/ingestion');
const { BlockCursor } = require('../src/core/block-cursor');

const LIVE = process.env.LIVE_RPC === '1';

test(
  'live Robinhood RPC drives ingestion sequentially',
  { skip: !LIVE },
  async () => {
    const provider = createProvider();

    try {
      const network = await provider.getNetwork();
      assert.equal(network.chainId.toString(), '4663');

      const liveHead = await provider.getBlockNumber();
      assert.ok(Number.isInteger(liveHead));
      assert.ok(liveHead > 10);

      const confirmations = 3;
      const startCursor = liveHead - confirmations - 2;

      const persisted = {
        version: 1,
        lastProcessedBlock: startCursor,
        status: 'READY',
        lastError: null,
        updatedAt: null,
      };

      const cursor = new BlockCursor({
        loadState: () => ({ ...persisted }),
        saveState: (state) => {
          Object.assign(persisted, state);
        },
      });

      const processed = [];

      const engine = new IngestionEngine({
        provider,
        cursor,
        confirmations,
        processor: async (block) => {
          processed.push(block);

          // Prove that each processed block exists on Robinhood Chain.
          const blockData = await provider.getBlock(block);

          assert.ok(blockData);
          assert.equal(blockData.number, block);
        },
      });

      const result = await engine.runOnce();

      assert.equal(result.latestBlock >= liveHead, true);
      assert.equal(result.safeHead, result.latestBlock - confirmations);
      assert.ok(result.processed >= 2);

      for (let i = 1; i < processed.length; i += 1) {
        assert.equal(processed[i], processed[i - 1] + 1);
      }

      assert.equal(cursor.get(), processed[processed.length - 1]);
      assert.equal(
        persisted.lastProcessedBlock,
        processed[processed.length - 1]
      );

      console.log('LIVE INGESTION: OK');
      console.log('Chain ID:', network.chainId.toString());
      console.log('Start cursor:', startCursor);
      console.log('Latest block:', result.latestBlock);
      console.log('Safe head:', result.safeHead);
      console.log('Processed:', processed.join(', '));
      console.log('Persisted cursor:', cursor.get());
    } finally {
      provider.destroy();
    }
  }
);
