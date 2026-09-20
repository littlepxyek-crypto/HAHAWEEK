'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  authorityRecordId,
  assertAuthorityRecord,
  createAuthorityRecord,
} = require('../src/core/v4-authority-record');

test('V4 authority record is deterministic and self-identifying', () => {
  const record = createAuthorityRecord({
    manifestGeneration: '7',
    manifestHash: '0x' + 'a'.repeat(64),
    checkpointInput: {
      generation: '7',
      manifest_hash: '0x' + 'a'.repeat(64),
    },
    checkpointHash: '0x' + 'b'.repeat(64),
    cursorInput: {
      generation: '7',
      checkpoint_hash: '0x' + 'b'.repeat(64),
      position: '101',
    },
    cursorHash: '0x' + 'c'.repeat(64),
    acquisitionPositionValid: true,
  });

  assert.equal(
    record.record_id,
    authorityRecordId(
      record.manifest_hash,
      record.checkpoint_hash,
      record.cursor_hash
    )
  );
  assert.equal(assertAuthorityRecord(record), true);
});

test('V4 authority record rejects identity mutation', () => {
  const record = createAuthorityRecord({
    manifestGeneration: '7',
    manifestHash: '0x' + 'a'.repeat(64),
    checkpointInput: {
      generation: '7',
      manifest_hash: '0x' + 'a'.repeat(64),
    },
    checkpointHash: '0x' + 'b'.repeat(64),
    cursorInput: {
      generation: '7',
      checkpoint_hash: '0x' + 'b'.repeat(64),
      position: '101',
    },
    cursorHash: '0x' + 'c'.repeat(64),
    acquisitionPositionValid: true,
  });

  record.cursor_hash = '0x' + 'd'.repeat(64);

  assert.throws(
    () => assertAuthorityRecord(record),
    /AUTHORITY_RECORD_INVALID/
  );
});

test('V4 authority record rejects missing integrity fields', () => {
  const record = createAuthorityRecord({
    manifestGeneration: '7',
    manifestHash: '0x' + 'a'.repeat(64),
    checkpointInput: {
      generation: '7',
      manifest_hash: '0x' + 'a'.repeat(64),
    },
    checkpointHash: '0x' + 'b'.repeat(64),
    cursorInput: {
      generation: '7',
      checkpoint_hash: '0x' + 'b'.repeat(64),
      position: '101',
    },
    cursorHash: '0x' + 'c'.repeat(64),
    acquisitionPositionValid: true,
  });

  delete record.checkpoint_hash;

  assert.throws(
    () => assertAuthorityRecord(record),
    /AUTHORITY_RECORD_INVALID/
  );
});
