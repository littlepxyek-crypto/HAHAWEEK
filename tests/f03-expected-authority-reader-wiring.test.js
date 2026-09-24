'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/core/database');
const { createDurableExpectedAuthorityFactory } = require('../src/index');
const {
  checkpointDigestFor,
  commitF03AuthorityChain,
} = require('../src/core/f03-authoritative-chain-persistence');
const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { createWriterFence } = require('../src/core/single-writer-fence');
const fs = require('fs');
const os = require('os');
const path = require('path');

function fixture() {
  const generation = '1';
  const segmentId = 'segment-550';
  const segmentDigest = 'a'.repeat(64);
  const manifestId = 'manifest-550';
  const manifestDigest = 'b'.repeat(64);
  const checkpointDigest = checkpointDigestFor(generation, manifestDigest);
  const committedAt = '2026-09-24T05:00:00.000Z';

  const p = (recordType, recordId, table, key, artifactId, upstreamRecordId, integrityDigest, extra = {}) => ({
    recordType,
    recordId,
    persistenceMechanism: 'sqlite',
    table,
    key,
    artifactId,
    ...(upstreamRecordId ? { upstreamRecordId } : {}),
    ...extra,
    generation,
    integrityDigest,
    committedAt,
  });

  const segment = {
    segmentId,
    fromBlock: 200,
    toBlock: 209,
    segmentDigest,
    generation,
    committedAt,
    provenance: p('segment', segmentId, 'f03_segments', segmentId, segmentId, undefined, segmentDigest, { fromBlock: 200, toBlock: 209 }),
  };

  const manifest = {
    manifestId,
    manifestDigest,
    generation,
    segmentId,
    segmentDigest,
    committedAt,
    provenance: p('manifest', manifestId, 'f03_manifests', manifestId, manifestId, segmentId, manifestDigest),
  };

  const checkpoint = {
    checkpointDigest,
    generation,
    manifestId,
    manifestDigest,
    committedAt,
    provenance: p('checkpoint', checkpointDigest, 'f03_checkpoints', checkpointDigest, checkpointDigest, manifestId, checkpointDigest),
  };

  return { segment, manifest, checkpoint };
}

test('STEP 550 expected-authority factory reads only the durable F-03 chain', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03-wiring-'));
  const writerFence = createWriterFence({
    filename: path.join(dir, 'writer-fence.json'),
    ownerId: 'wiring-test',
  });
  writerFence.acquire();
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-state.json'),
    writerFence,
  });
  const database = await createDatabase(path.join(dir, 'hahaweek.sqlite'), {
    legacyWriteBarrier: barrier,
  });

  commitF03AuthorityChain({
    database,
    writerFence,
    ...fixture(),
  });

  const expectedFactory = createDurableExpectedAuthorityFactory(database);
  const expected = expectedFactory({ fromBlock: 200, toBlock: 209 });

  assert.deepEqual(expected, {
    status: 'VERIFIED',
    fromBlock: 200,
    toBlock: 209,
    segmentId: 'segment-550',
    manifestId: 'manifest-550',
    manifestDigest: 'b'.repeat(64),
    checkpointDigest: checkpointDigestFor('1', 'b'.repeat(64)),
    generation: '1',
    cursorBlock: 209,
  });

  database.close();
  writerFence.release();
});

test('STEP 550 expected-authority factory fails closed when durable chain is absent', async () => {
  const database = await createDatabase(':memory:');
  const expectedFactory = createDurableExpectedAuthorityFactory(database);

  assert.throws(
    () => expectedFactory({ fromBlock: 1, toBlock: 2 }),
    /F03_CHAIN_NOT_FOUND/
  );

  database.close();
});
