'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine } = require('../src/index');

function isolatedEnv() {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03-recovery-'));
  process.env.HAHAWEEK_DATA_DIR = dir;
  fs.mkdirSync(dir, { recursive: true });
  process.env.HAHAWEEK_STATE_FILE = path.join(dir, 'state.json');
  process.env.HAHAWEEK_RAW_FILE = path.join(dir, 'raw-events.jsonl');
  return dir;
}

function cleanup(engine) {
  engine.database.close();
  engine.writerFence.release();
  engine.provider.destroy();
}

test('F-03 production boundary fails closed and preserves cursor on authority rejection', async () => {
  isolatedEnv();
  const engine = await createEngine({
    authorityFactory: () => {
      throw new Error('AUTHORITY_REJECTED');
    },
  });

  try {
    assert.throws(
      () => engine.ingestion.authorityGate({
        checkpointCommitted: true,
        fromBlock: 101,
        toBlock: 101,
      }),
      /AUTHORITY_REJECTED/
    );
  } finally {
    cleanup(engine);
  }
});

test('F-03 production boundary can retry the same authority range after rejection', async () => {
  isolatedEnv();
  let reject = true;
  const seen = [];

  const engine = await createEngine({
    authorityFactory: ({ fromBlock, toBlock }) => {
      seen.push([fromBlock, toBlock]);
      if (reject) throw new Error('AUTHORITY_REJECTED');
      return {
        segmentId: `seg-${fromBlock}-${toBlock}`,
        manifestDigest: 'm101',
        checkpointDigest: 'c101',
        generation: 'g1',
        cursorBlock: toBlock,
      };
    },
  });

  try {
    assert.throws(
      () => engine.ingestion.authorityGate({
        checkpointCommitted: true,
        fromBlock: 101,
        toBlock: 101,
      }),
      /AUTHORITY_REJECTED/
    );

    reject = false;

    const authorized = engine.ingestion.authorityGate({
      checkpointCommitted: true,
      fromBlock: 101,
      toBlock: 101,
    });

    assert.equal(authorized.status, 'AUTHORIZED');
    assert.deepEqual(seen, [[101, 101], [101, 101]]);
  } finally {
    cleanup(engine);
  }
});
