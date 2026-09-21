'use strict';

const crypto = require('crypto');

const UINT_RE = /^(0|[1-9][0-9]*)$/;
const HEX32_RE = /^[0-9a-f]{64}$/;

function assertCount(value, name) {
  if (typeof value !== 'string' || !UINT_RE.test(value)) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function canonicalDisposition(record) {
  if (!record || typeof record !== 'object') throw new Error('DISPOSITION_REQUIRED');
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'record_id,status') throw new Error('DISPOSITION_KEYS_INVALID');
  if (typeof record.record_id !== 'string' || record.record_id.length === 0) {
    throw new Error('RECORD_ID_INVALID');
  }
  const allowed = new Set(['PRESERVE', 'MIGRATE', 'QUARANTINE', 'REJECT']);
  if (!allowed.has(record.status)) throw new Error('DISPOSITION_STATUS_INVALID');
  return JSON.stringify({ record_id: record.record_id, status: record.status });
}

function dispositionDigest(dispositions) {
  if (!Array.isArray(dispositions)) throw new Error('DISPOSITIONS_REQUIRED');
  const bytes = Buffer.from(dispositions.map(canonicalDisposition).join('\n'), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function migrationIdentity(input) {
  if (!input || typeof input !== 'object') throw new Error('MIGRATION_INPUT_REQUIRED');
  const required = ['source_digest', 'source_byte_length', 'source_record_count', 'disposition_digest'];
  const keys = Object.keys(input).sort();
  if (keys.join(',') !== required.slice().sort().join(',')) throw new Error('MIGRATION_INPUT_KEYS_INVALID');
  if (!HEX32_RE.test(input.source_digest) || !HEX32_RE.test(input.disposition_digest)) {
    throw new Error('MIGRATION_DIGEST_INVALID');
  }
  assertCount(input.source_byte_length, 'SOURCE_BYTE_LENGTH');
  assertCount(input.source_record_count, 'SOURCE_RECORD_COUNT');

  const canonical = JSON.stringify({
    source_digest: input.source_digest,
    source_byte_length: input.source_byte_length,
    source_record_count: input.source_record_count,
    disposition_digest: input.disposition_digest,
  });

  return crypto.createHash('sha256').update(Buffer.from(canonical, 'utf8')).digest('hex');
}

function createMigrationManifest({ sourceDigest, sourceByteLength, sourceRecordCount, dispositions }) {
  const digest = dispositionDigest(dispositions);
  const identity = migrationIdentity({
    source_digest: sourceDigest,
    source_byte_length: assertCount(sourceByteLength, 'SOURCE_BYTE_LENGTH'),
    source_record_count: assertCount(sourceRecordCount, 'SOURCE_RECORD_COUNT'),
    disposition_digest: digest,
  });

  return Object.freeze({
    protocol: 'HAHAWEEK-V4-LEGACY-MIGRATION-V0.1',
    version: '0.1',
    source_digest: sourceDigest,
    source_byte_length: sourceByteLength,
    source_record_count: sourceRecordCount,
    disposition_digest: digest,
    migration_identity: identity,
  });
}

module.exports = {
  dispositionDigest,
  migrationIdentity,
  createMigrationManifest,
};
