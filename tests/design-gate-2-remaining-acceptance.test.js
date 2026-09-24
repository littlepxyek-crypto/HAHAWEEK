'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { createWriterFence } = require('../src/core/single-writer-fence');
const { createAuthorityGate } = require('../src/core/f03-ingestion-authority-integration');
const { createDurableExpectedAuthorityFactory } = require('../src/index');
const { checkpointDigestFor, commitF03AuthorityChain } = require('../src/core/f03-authoritative-chain-persistence');
const { assertProductionAuthority } = require('../src/core/f03-production-authority-record');
const { assertAuthorityBinding, createAuthorityBindingDigest } = require('../src/core/f03-authority-binding');

function fixture() {
  const generation = '1';
  const segmentId = 'gate2-segment';
  const segmentDigest = 'a'.repeat(64);
  const manifestId = 'gate2-manifest';
  const manifestDigest = 'b'.repeat(64);
  const checkpointDigest = checkpointDigestFor(generation, manifestDigest);
  const committedAt = '2026-09-24T06:30:00.000Z';

  const provenance = (recordType, recordId, table, key, artifactId, integrityDigest, upstreamRecordId, extra = {}) => ({
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

  return {
    segment: {
      segmentId,
      fromBlock: 400,
      toBlock: 409,
      segmentDigest,
      generation,
      committedAt,
      provenance: provenance('segment', segmentId, 'f03_segments', segmentId, segmentId, segmentDigest, undefined, {
        fromBlock: 400,
        toBlock: 409,
      }),
    },
    manifest: {
      manifestId,
      manifestDigest,
      generation,
      segmentId,
      segmentDigest,
      committedAt,
      provenance: provenance('manifest', manifestId, 'f03_manifests', manifestId, manifestId, manifestDigest, segmentId),
    },
    checkpoint: {
      checkpointDigest,
      generation,
      manifestId,
      manifestDigest,
      committedAt,
      provenance: provenance('checkpoint', checkpointDigest, 'f03_checkpoints', checkpointDigest, checkpointDigest, checkpointDigest, manifestId),
    },
  };
}

test('Gate 2 production boundary uses durable expected authority and rejects absence', async () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hahaweek-gate2-'));
  const writerFence = createWriterFence({
    filename: path.join(dir, 'writer-fence.json'),
    ownerId: 'gate2-test',
  });
  writerFence.acquire();

  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-state.json'),
    writerFence,
  });

  const database = await createDatabase(path.join(dir, 'hahaweek.sqlite'), {
    legacyWriteBarrier: barrier,
  });

  try {
    const expectedAuthorityFactory = createDurableExpectedAuthorityFactory(database);
    const authorityGate = createAuthorityGate({
      authorityFactory: ({ fromBlock, toBlock }) => {
        const authority = {
          segmentId: 'gate2-segment',
          manifestDigest: 'b'.repeat(64),
          checkpointDigest: checkpointDigestFor('1', 'b'.repeat(64)),
          generation: '1',
          cursorBlock: toBlock,
          fromBlock,
          toBlock,
        };
        return { ...authority, bindingDigest: createAuthorityBindingDigest(authority) };
      },
      expectedAuthorityFactory,
      authorityValidator: assertProductionAuthority,
      authorityBindingValidator: assertAuthorityBinding,
    });

    assert.throws(
      () => authorityGate({
        checkpointCommitted: true,
        fromBlock: 500,
        toBlock: 509,
        blockNumber: 509,
      }),
      /F03_CHAIN_NOT_FOUND/,
    );

    commitF03AuthorityChain({
      database,
      writerFence,
      ...fixture(),
    });

    const result = authorityGate({
      checkpointCommitted: true,
      fromBlock: 400,
      toBlock: 409,
      blockNumber: 409,
    });

    assert.equal(result.status, 'AUTHORIZED');
    assert.equal(result.segmentId, 'gate2-segment');
    assert.equal(result.cursorBlock, 409);
  } finally {
    database.close();
    writerFence.release();
  }
});

test('Gate 2 production wiring binds the durable reader as the default expected source', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'index.js'),
    'utf8',
  );

  assert.match(
    source,
    /expectedAuthorityFactory \|\| createDurableExpectedAuthorityFactory\(database\)/,
  );
  assert.match(source, /readF03AuthorityChain/);
});

test('Gate 2 independent recovery verifier remains source-independent', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'verification', 'independent-recovery-verifier.js'),
    'utf8',
  );

  assert.doesNotMatch(source, /src[\\/]reference[\\/]v4/);
});
