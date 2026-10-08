'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const { verifyLegacySourceVector } = require('../src/reference/v4/legacy-migration');
const {
  createMigrationManifest,
  dispositionDigest,
} = require('../src/reference/v4/migration-manifest');

const vectors = require('../docs/golden-vectors/f04a-legacy-source.json');

function sourceVector(id) {
  const v = vectors.vectors.find((item) => item.id === id);
  assert.ok(v, `missing vector: ${id}`);
  return v;
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('F-04D end-to-end migration fixture is reproducible', () => {
  const source = sourceVector('source-ascii');
  const verified = verifyLegacySourceVector(source);

  assert.equal(verified.valid, true);

  const dispositions = [
    { record_id: 'legacy-1', status: 'PRESERVE' },
  ];

  const manifest = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: source.source_record_count,
    dispositions,
  });

  const rebuilt = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: source.source_record_count,
    dispositions,
  });

  assert.deepEqual(manifest, rebuilt);
});

test('F-04D manifest binds the exact source digest', () => {
  const source = sourceVector('source-ascii');
  const verified = verifyLegacySourceVector(source);

  const manifest = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: '1',
    dispositions: [
      { record_id: 'legacy-1', status: 'PRESERVE' },
    ],
  });

  assert.equal(manifest.source_digest, verified.sha256);
  assert.equal(manifest.source_byte_length, '8');
});

test('F-04D changing source bytes invalidates the migration manifest', () => {
  const source = sourceVector('source-ascii');
  const verified = verifyLegacySourceVector(source);

  const original = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: '1',
    dispositions: [
      { record_id: 'legacy-1', status: 'PRESERVE' },
    ],
  });

  const tamperedBytes = Buffer.from('hahaweef', 'utf8');
  const tamperedDigest = sha256Hex(tamperedBytes);

  assert.notEqual(tamperedDigest, original.source_digest);

  const tampered = createMigrationManifest({
    sourceDigest: tamperedDigest,
    sourceByteLength: String(tamperedBytes.length),
    sourceRecordCount: '1',
    dispositions: [
      { record_id: 'legacy-1', status: 'PRESERVE' },
    ],
  });

  assert.notEqual(
    tampered.migration_identity,
    original.migration_identity
  );
});

test('F-04D changing disposition invalidates the manifest identity', () => {
  const source = sourceVector('source-ascii');
  const verified = verifyLegacySourceVector(source);

  const a = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: '1',
    dispositions: [
      { record_id: 'legacy-1', status: 'PRESERVE' },
    ],
  });

  const b = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: '1',
    dispositions: [
      { record_id: 'legacy-1', status: 'QUARANTINE' },
    ],
  });

  assert.notEqual(a.disposition_digest, b.disposition_digest);
  assert.notEqual(a.migration_identity, b.migration_identity);
});

test('F-04D source record count remains an explicit migration input', () => {
  const source = sourceVector('source-ascii');
  const verified = verifyLegacySourceVector(source);

  const manifest = createMigrationManifest({
    sourceDigest: verified.sha256,
    sourceByteLength: verified.byteLength,
    sourceRecordCount: '2',
    dispositions: [
      { record_id: 'legacy-1', status: 'PRESERVE' },
    ],
  });

  assert.equal(manifest.source_record_count, '2');
  assert.equal(
    manifest.disposition_digest,
    dispositionDigest([{ record_id: 'legacy-1', status: 'PRESERVE' }])
  );
});
