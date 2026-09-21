'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  dispositionDigest,
  migrationIdentity,
  createMigrationManifest,
} = require('../src/reference/v4/migration-manifest');

const SOURCE_DIGEST = '5ecc48c3a6742b7fd99e5701843b7ddcf2656059b99d3d2ed24ca104214d8b8e';

test('F-04C disposition digest is deterministic', () => {
  const dispositions = [
    { record_id: 'legacy-1', status: 'PRESERVE' },
    { record_id: 'legacy-2', status: 'MIGRATE' },
  ];

  assert.equal(
    dispositionDigest(dispositions),
    dispositionDigest([
      { record_id: 'legacy-1', status: 'PRESERVE' },
      { record_id: 'legacy-2', status: 'MIGRATE' },
    ])
  );
});

test('F-04C migration identity is deterministic', () => {
  const dispositions = [
    { record_id: 'legacy-1', status: 'PRESERVE' },
    { record_id: 'legacy-2', status: 'QUARANTINE' },
  ];

  const manifestA = createMigrationManifest({
    sourceDigest: SOURCE_DIGEST,
    sourceByteLength: '8',
    sourceRecordCount: '2',
    dispositions,
  });

  const manifestB = createMigrationManifest({
    sourceDigest: SOURCE_DIGEST,
    sourceByteLength: '8',
    sourceRecordCount: '2',
    dispositions,
  });

  assert.equal(manifestA.migration_identity, manifestB.migration_identity);
  assert.equal(manifestA.disposition_digest, manifestB.disposition_digest);
});

test('F-04C disposition status is explicit', () => {
  assert.throws(
    () => dispositionDigest([{ record_id: 'legacy-1', status: 'MIGRATE' }]),
    () => false
  );

  assert.throws(
    () => dispositionDigest([{ record_id: 'legacy-1', status: 'UNKNOWN' }]),
    /DISPOSITION_STATUS_INVALID/
  );
});

test('F-04C changing disposition changes migration identity', () => {
  const base = [
    { record_id: 'legacy-1', status: 'PRESERVE' },
  ];

  const changed = [
    { record_id: 'legacy-1', status: 'QUARANTINE' },
  ];

  const a = createMigrationManifest({
    sourceDigest: SOURCE_DIGEST,
    sourceByteLength: '8',
    sourceRecordCount: '1',
    dispositions: base,
  });

  const b = createMigrationManifest({
    sourceDigest: SOURCE_DIGEST,
    sourceByteLength: '8',
    sourceRecordCount: '1',
    dispositions: changed,
  });

  assert.notEqual(a.migration_identity, b.migration_identity);
  assert.notEqual(a.disposition_digest, b.disposition_digest);
});

test('F-04C manifest does not depend on timestamps or filesystem paths', () => {
  const manifest = createMigrationManifest({
    sourceDigest: SOURCE_DIGEST,
    sourceByteLength: '8',
    sourceRecordCount: '1',
    dispositions: [{ record_id: 'legacy-1', status: 'PRESERVE' }],
  });

  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'timestamp'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'path'), false);
});

test('F-04C unknown provenance cannot be silently converted to migration', () => {
  assert.throws(
    () => dispositionDigest([{ record_id: 'legacy-unknown', status: 'UNKNOWN' }]),
    /DISPOSITION_STATUS_INVALID/
  );
});
