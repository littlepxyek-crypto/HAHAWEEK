'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');
const { BlockCursor } = require('../src/core/block-cursor');

function makeProvider(head) {
  return {
    async getBlockNumber() {
      return head;
    },
  };
}

test('restart resumes exactly after persisted cursor', async () => {
  const persisted = {
    version: 1,
    lastProcessedBlock: 100,
    status: 'READY',
    lastError: null,
    updatedAt: null,
  };

  function makeCursor() {
    return new BlockCursor({
      loadState: () => ({ ...persisted }),
      saveState: (state) => {
        Object.assign(persisted, state);
      },
    });
  }

  const firstProcessed = [];

  const firstEngine = new IngestionEngine({
    provider: makeProvider(103),
    cursor: makeCursor(),
    confirmations: 0,
    processor: async (block) => {
      firstProcessed.push(block);

      if (block === 102) {
        throw new Error('SIMULATED_PROCESSOR_FAILURE');
      }
    },
  });

  await assert.rejects(
    () => firstEngine.runOnce(),
    /SIMULATED_PROCESSOR_FAILURE/
  );

  assert.deepEqual(firstProcessed, [101, 102]);
  assert.equal(persisted.lastProcessedBlock, 101);

  const secondProcessed = [];

  const secondEngine = new IngestionEngine({
    provider: makeProvider(103),
    cursor: makeCursor(),
    confirmations: 0,
    processor: async (block) => {
      secondProcessed.push(block);
    },
  });

  const result = await secondEngine.runOnce();

  assert.deepEqual(secondProcessed, [102, 103]);
  assert.equal(result.cursor, 103);
  assert.equal(persisted.lastProcessedBlock, 103);

  console.log('RESTART RECOVERY: OK');
  console.log('First run:', firstProcessed.join(', '));
  console.log('Restart run:', secondProcessed.join(', '));
  console.log('Final cursor:', persisted.lastProcessedBlock);
});
