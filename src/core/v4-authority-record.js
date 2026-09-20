'use strict';

const crypto = require('node:crypto');

const AUTHORITY_SCHEMA_VERSION = 1;

function authorityRecordId(manifestHash, checkpointHash, cursorHash) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        manifest_hash: manifestHash,
        checkpoint_hash: checkpointHash,
        cursor_hash: cursorHash,
      })
    )
    .digest('hex');
}

function assertAuthorityRecord(record) {
  if (!record || record.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    throw new Error('AUTHORITY_RECORD_INVALID');
  }

  const required = [
    'record_id',
    'manifest_generation',
    'manifest_hash',
    'checkpoint_input',
    'checkpoint_hash',
    'cursor_input',
    'cursor_hash',
    'acquisition_position_valid',
  ];

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw new Error('AUTHORITY_RECORD_INVALID');
    }
  }

  if (
    typeof record.manifest_generation !== 'string' ||
    typeof record.manifest_hash !== 'string' ||
    typeof record.checkpoint_hash !== 'string' ||
    typeof record.cursor_hash !== 'string' ||
    typeof record.acquisition_position_valid !== 'boolean' ||
    !record.checkpoint_input ||
    !record.cursor_input
  ) {
    throw new Error('AUTHORITY_RECORD_INVALID');
  }

  const expectedId = authorityRecordId(
    record.manifest_hash,
    record.checkpoint_hash,
    record.cursor_hash
  );

  if (record.record_id !== expectedId) {
    throw new Error('AUTHORITY_RECORD_INVALID');
  }

  return true;
}

function createAuthorityRecord({
  manifestGeneration,
  manifestHash,
  checkpointInput,
  checkpointHash,
  cursorInput,
  cursorHash,
  acquisitionPositionValid,
}) {
  const record = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    manifest_generation: manifestGeneration,
    manifest_hash: manifestHash,
    checkpoint_input: checkpointInput,
    checkpoint_hash: checkpointHash,
    cursor_input: cursorInput,
    cursor_hash: cursorHash,
    acquisition_position_valid: acquisitionPositionValid,
  };

  return {
    ...record,
    record_id: authorityRecordId(
      manifestHash,
      checkpointHash,
      cursorHash
    ),
  };
}

module.exports = {
  AUTHORITY_SCHEMA_VERSION,
  authorityRecordId,
  assertAuthorityRecord,
  createAuthorityRecord,
};
