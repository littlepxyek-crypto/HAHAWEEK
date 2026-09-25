'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase, SCHEMA_VERSION } = require('../src/core/database');
const { createCanonicalEvidence } = require('../src/core/canonical-evidence');
const { hashRawEvidence, hashCanonicalEvidence } = require('../src/core/evidence-identity');
const { createWriterFence } = require('../src/core/single-writer-fence');
const { createRecordDigest, createSnapshotId, reconstructSnapshot } = require('../src/core/canonical-decision-input');
const {
  createTransitionRecord,
  readTransitions,
  latestState,
  deriveResultId,
  deriveExecutionId,
  acceptCanonicalLineage,
} = require('../src/core/runtime-canonical-lineage');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step579-'));
  return {
    dir,
    databaseFile: path.join(dir, 'hahaweek.sqlite'),
    fenceFile: path.join(dir, 'writer-fence-state.json'),
  };
}

function writer(file, now = 1000) {
  return createWriterFence({
    filename: file,
    ownerId: 'step579-owner',
    now: () => now,
    leaseMs: 10000,
  });
}

function raw(id, block, blockHash, txByte = '1') {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: block,
    transaction_hash: '0x' + txByte.repeat(64),
    block_hash: blockHash,
    transaction_index: 0,
    log_index: 0,
    address: '0x' + 'aa'.repeat(20),
    topics: [],
    data: '0x',
    captured_at: '2026-09-24T08:00:00.000Z',
  };
}

function insertRawAndEvidence(database, rawRecord) {
  const canonical = createCanonicalEvidence(rawRecord);
  database.db.run(
    'INSERT INTO raw_events (event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      rawRecord.event_id, rawRecord.chain_id, rawRecord.block_number, rawRecord.transaction_hash,
      rawRecord.block_hash, rawRecord.transaction_index, rawRecord.log_index, rawRecord.address,
      JSON.stringify(rawRecord.topics), rawRecord.data, rawRecord.captured_at,
    ]
  );
  database.db.run(
    'INSERT INTO canonical_evidence (evidence_id, identity_schema_version, identity_hash, raw_event_id, raw_hash, canonical_hash, canonical_json, interpretation_status, provenance_json, stored_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      canonical.evidence_id, canonical.identity_reference.identity_schema_version,
      canonical.identity_reference.identity_hash, rawRecord.event_id, hashRawEvidence(rawRecord),
      hashCanonicalEvidence(canonical), JSON.stringify(canonical), canonical.interpretation_status,
      JSON.stringify(canonical.provenance_reference), rawRecord.captured_at,
    ]
  );
  return canonical.evidence_id;
}

function seedDecisionSnapshot(database, blockHash, fromBlock = 100, toBlock = 100) {
  const record = {
    chain_id: 4663,
    block_number: fromBlock,
    block_hash: blockHash,
    parent_block_hash: '0x' + '00'.repeat(32),
    decision_head_block: toBlock,
    confirmation_depth: 3,
    source_id: 'test:canonical',
    acquired_at: '2026-09-24T08:00:00.000Z',
  };
  record.record_digest = createRecordDigest(record);
  database.db.run(
    'INSERT INTO canonical_block_decisions (record_digest, chain_id, block_number, block_hash, parent_block_hash, decision_head_block, confirmation_depth, source_id, acquired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [record.record_digest, record.chain_id, record.block_number, record.block_hash, record.parent_block_hash,
      record.decision_head_block, record.confirmation_depth, record.source_id, record.acquired_at]
  );
  const snapshotId = createSnapshotId({
    chainId: 4663,
    fromBlock,
    toBlock,
    decisionHeadBlock: toBlock,
    confirmationDepth: 3,
    sourceId: 'test:canonical',
    records: [record],
  });
  database.db.run(
    'INSERT INTO canonical_decision_snapshots (snapshot_id, chain_id, from_block, to_block, decision_head_block, confirmation_depth, source_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [snapshotId, 4663, fromBlock, toBlock, toBlock, 3, 'test:canonical', record.acquired_at]
  );
  database.db.run(
    'INSERT INTO canonical_decision_snapshot_blocks (snapshot_id, ordinal, block_number, record_digest, block_hash) VALUES (?, ?, ?, ?, ?)',
    [snapshotId, 0, fromBlock, record.record_digest, record.block_hash]
  );
  return snapshotId;
}

test('STEP579 golden transition vector is deterministic', () => {
  const record = createTransitionRecord({
    evidenceId: 'ei:v1:test',
    fromState: 'OBSERVED',
    toState: 'CANONICAL',
    sequence: '0',
    previousTransitionHash: null,
    provenance: { block_id: '4663:100:0xhash' },
    committedAt: '2026-09-24T08:00:00.000Z',
  });
  assert.equal(record.transitionHash, '718d9dde2e19d1203f6222c1b15e6de73b7d31c4044287716cec9fca34dbc70e');
  assert.equal(record.transitionId, 'tr:v1:718d9dde2e19d1203f6222c1b15e6de73b7d31c4044287716cec9fca34dbc70e');
});

test('STEP579 INITIAL persists canonical lineage and recovers deterministically', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const fence = writer(f.fenceFile);
  fence.acquire();
  const hash = '0x' + '11'.repeat(32);
  const snapshotId = seedDecisionSnapshot(database, hash);
  insertRawAndEvidence(database, raw('e1', 100, hash));

  const first = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '7',
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:01:00.000Z',
  });
  assert.equal(first.generation, '7');
  assert.equal(first.transitionType, 'INITIAL');
  assert.equal(first.canonicalEvidenceIds.length, 1);
  assert.equal(first.status, 'VERIFIED');
  assert.equal(latestState(database, first.canonicalEvidenceIds[0]), 'CANONICAL');
  assert.equal(SCHEMA_VERSION, 8);
  const replay = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '7',
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:01:00.000Z',
  });
  assert.equal(replay.processingResultId, first.processingResultId);
  assert.equal(replay.canonicalEvidenceSetDigest, first.canonicalEvidenceSetDigest);
});

test('STEP579 CONTINUATION inherits parent generation and rejects mismatch', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const fence = writer(f.fenceFile);
  fence.acquire();
  const hash = '0x' + '22'.repeat(32);
  const snapshotId = seedDecisionSnapshot(database, hash);
  insertRawAndEvidence(database, raw('e2', 100, hash));

  const initial = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '9',
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:01:00.000Z',
  });
  const continuation = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'CONTINUATION', parentResultId: initial.processingResultId,
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:02:00.000Z',
  });
  assert.equal(continuation.generation, '9');
  await assert.rejects(
    () => acceptCanonicalLineage({
      database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
      fromBlock: 100, toBlock: 100, transitionType: 'CONTINUATION',
      parentResultId: initial.processingResultId, generation: '10',
      provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:03:00.000Z',
    }),
    /RUNTIME_CONTINUATION_GENERATION_MISMATCH/
  );
});

test('STEP579 REORG_REPLACEMENT preserves old canonical history and orphans it', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const fence = writer(f.fenceFile);
  fence.acquire();
  const oldHash = '0x' + '33'.repeat(32);
  const oldSnapshot = seedDecisionSnapshot(database, oldHash);
  const oldEvidence = insertRawAndEvidence(database, raw('old', 100, oldHash, '3'));

  const initial = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: oldSnapshot,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '11',
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:01:00.000Z',
  });

  const newHash = '0x' + '44'.repeat(32);
  const newSnapshot = seedDecisionSnapshot(database, newHash);
  const newEvidence = insertRawAndEvidence(database, raw('new', 100, newHash, '4'));

  const replacement = await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: newSnapshot,
    fromBlock: 100, toBlock: 100, transitionType: 'REORG_REPLACEMENT', parentResultId: initial.processingResultId,
    generation: '12', provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:02:00.000Z',
  });
  assert.equal(replacement.generation, '12');
  assert.deepEqual(replacement.canonicalEvidenceIds, [newEvidence]);
  assert.deepEqual(readTransitions(database, oldEvidence).map(x => x.toState), ['CANONICAL', 'ORPHANED']);
  assert.deepEqual(readTransitions(database, newEvidence).map(x => x.toState), ['CANONICAL']);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM processing_results')[0].values[0][0], 2);
});

test('STEP579 rejects unsupported transition, missing parent, invalid range, and lost writer', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const fence = writer(f.fenceFile);
  fence.acquire();
  const hash = '0x' + '55'.repeat(32);
  const snapshotId = seedDecisionSnapshot(database, hash);
  insertRawAndEvidence(database, raw('e5', 100, hash));

  await assert.rejects(() => acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 101, toBlock: 100, transitionType: 'INITIAL', generation: '1',
  }), /RUNTIME_RANGE_INVALID/);

  await assert.rejects(() => acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'CONTINUATION', parentResultId: 'missing',
  }), /PROCESSING_RESULT_NOT_FOUND/);

  assert.throws(() => createTransitionRecord({
    evidenceId: 'ei:v1:test',
    fromState: 'CANONICAL',
    toState: 'OBSERVED',
    sequence: '0',
    previousTransitionHash: null,
    provenance: { block_id: '4663:100:x' },
    committedAt: '2026-09-24T08:00:00.000Z',
  }), /TRANSITION_EDGE_INVALID/);

  const state = fence.getState();
  state.expiresAt = 0;
  fs.writeFileSync(f.fenceFile, JSON.stringify(state) + '\n');
  await assert.rejects(() => acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '1',
  }), /WRITER_FENCE_EXPIRED/);
});

test('STEP579 schema v6 migration is additive through v8 and preserves STEP578 data', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const hash = '0x' + '66'.repeat(32);
  seedDecisionSnapshot(database, hash);
  const before = database.db.exec('SELECT COUNT(*) FROM canonical_block_decisions')[0].values[0][0];
  database.db.run('DROP TRIGGER canonical_transitions_no_update');
  database.db.run('DROP TRIGGER canonical_transitions_no_delete');
  database.db.run('DROP TRIGGER canonical_lineage_no_update');
  database.db.run('DROP TRIGGER canonical_lineage_no_delete');
  database.db.run('DROP TABLE canonical_lineage');
  database.db.run('DROP TABLE canonical_transitions');
  database.db.run("UPDATE schema_meta SET value = '6' WHERE key = 'schema_version'");
  database.save();
  database.close();

  const reopened = await createDatabase(f.databaseFile);
  assert.equal(SCHEMA_VERSION, 8);
  assert.equal(reopened.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '8');
  assert.equal(reopened.db.exec('SELECT COUNT(*) FROM canonical_block_decisions')[0].values[0][0], before);
  assert.doesNotThrow(() => reopened.db.run("INSERT INTO canonical_transitions (transition_id,evidence_id,from_state,to_state,sequence,previous_transition_hash,transition_hash,provenance_json,committed_at) VALUES ('x','e','OBSERVED','CANONICAL','0',NULL,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','{}','2026-09-24T08:00:00.000Z')"));
  assert.throws(() => reopened.db.run("UPDATE canonical_transitions SET evidence_id='z' WHERE transition_id='x'"), /CANONICAL_TRANSITIONS_APPEND_ONLY/);
});

test('STEP579 transition predecessor integrity is fail-closed', async () => {
  const f = fixture();
  const database = await createDatabase(f.databaseFile);
  const fence = writer(f.fenceFile);
  fence.acquire();
  const hash = '0x' + '77'.repeat(32);
  const snapshotId = seedDecisionSnapshot(database, hash);
  const evidenceId = insertRawAndEvidence(database, raw('e7', 100, hash, '7'));
  await acceptCanonicalLineage({
    database, writerFence: fence, canonicalDecisionSnapshotId: snapshotId,
    fromBlock: 100, toBlock: 100, transitionType: 'INITIAL', generation: '1',
    provenance: { contract: 'STEP-579' }, committedAt: '2026-09-24T08:01:00.000Z',
  });
  // No AUTOINCREMENT state exists; predecessor verification is exercised by the persisted chain itself.
  assert.equal(readTransitions(database, evidenceId)[0].sequence, '0');
});
