'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createEngine } = require('../src/index');
const { checkpointDigestFor, commitF03AuthorityChain } = require('../src/core/f03-authoritative-chain-persistence');

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

  const segment = {
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
  };

  const manifest = {
    manifestId,
    manifestDigest,
    generation,
    segmentId,
    segmentDigest,
    committedAt,
    provenance: provenance('manifest', manifestId, 'f03_manifests', manifestId, manifestId, manifestDigest, segmentId),
  };

  const checkpoint = {
    checkpointDigest,
    generation,
    manifestId,
    manifestDigest,
    committedAt,
    provenance: provenance('checkpoint', checkpointDigest, 'f03_checkpoints', checkpointDigest, checkpointDigest, checkpointDigest, manifestId),
  };

  return { segment, manifest, checkpoint };
}

function cleanup(engine) {
  try { engine.database.close(); } finally {
    try { engine.writerFence.release(); } finally {
      try { engine.provider.destroy(); } catch {}
    }
  }
}

test('Gate 2 production wiring reads expected authority from durable F-03 state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-gate2-'));
  const engine = await createEngine({
    dataDir: dir,
    stateFile: path.join(dir, 'state.json'),
    rawEventsFile: path.join(dir, 'raw-events.jsonl'),
  });

  try {
    commitF03AuthorityChain({
      database: engine.database,
      writerFence: engine.writerFence,
      ...fixture(),
    });

    const result = engine.ingestion.authorityGate({
      checkpointCommitted: true,
      fromBlock: 400,
      toBlock: 409,
      blockNumber: 409,
    });

    assert.equal(result.status, 'AUTHORIZED');
    assert.equal(result.authority.cursorBlock, 409);
    assert.equal(result.expectedAuthority.cursorBlock, 409);
    assert.equal(result.authority.segmentId, 'gate2-segment');
    assert.equal(result.expectedAuthority.manifestDigest, 'b'.repeat(64));
  } finally {
    cleanup(engine);
  }
});

test('Gate 2 production wiring fails closed when durable expected authority is absent', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-gate2-empty-'));
  const engine = await createEngine({
    dataDir: dir,
    stateFile: path.join(dir, 'state.json'),
    rawEventsFile: path.join(dir, 'raw-events.jsonl'),
  });

  try {
    assert.throws(
      () => engine.ingestion.authorityGate({
        checkpointCommitted: true,
        fromBlock: 500,
        toBlock: 509,
        blockNumber: 509,
      }),
      /F03_CHAIN_NOT_FOUND/,
    );
  } finally {
    cleanup(engine);
  }
});

test('Gate 2 independent recovery verifier remains source-independent', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'verification', 'independent-recovery-verifier.js'),
    'utf8',
  );

  assert.doesNotMatch(source, /src[\\/]reference[\\/]v4/);
  assert.doesNotMatch(source, /require\(['"]\.\.\/reference\/v4/);
});
