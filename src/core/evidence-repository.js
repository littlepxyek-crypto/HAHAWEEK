'use strict';

const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

const { hashRawEvidence, hashCanonicalEvidence, createEvidenceIdentity } = require('./evidence-identity');

function createEvidenceRepository(db, options = {}) {
  if (!db) throw new Error('DATABASE_REQUIRED');

  const legacyWriteBarrier = options.legacyWriteBarrier || createLegacyWriteBarrier();

  return {
    insert(raw, canonical) {
      if (!raw || !canonical) throw new Error('EVIDENCE_REQUIRED');
      if (!canonical.evidence_id) throw new Error('EVIDENCE_ID_REQUIRED');
      if (!canonical.identity_reference) throw new Error('EVIDENCE_IDENTITY_REQUIRED');
      if (canonical.raw_reference?.event_id !== raw.event_id) {
        throw new Error('RAW_REFERENCE_MISMATCH');
      }

      const rawHash = hashRawEvidence(raw);
      const canonicalHash = hashCanonicalEvidence(canonical);
      const existing = db.exec(
        'SELECT canonical_hash, raw_hash FROM canonical_evidence WHERE evidence_id = ?',
        [canonical.evidence_id]
      );

      if (existing.length && existing[0].values.length) {
        const [existingCanonicalHash, existingRawHash] = existing[0].values[0];
        if (existingCanonicalHash !== canonicalHash || existingRawHash !== rawHash) {
          throw new Error('EVIDENCE_CONFLICT');
        }
        return { inserted: false, evidenceId: canonical.evidence_id, rawHash, canonicalHash };
      }

      const rawExists = db.exec(
        'SELECT 1 FROM raw_events WHERE event_id = ?',
        [raw.event_id]
      );
      if (!rawExists.length || !rawExists[0].values.length) {
        throw new Error('RAW_EVIDENCE_NOT_STORED');
      }

      legacyWriteBarrier.assertWritable();

      db.run(
        `INSERT INTO canonical_evidence (
          evidence_id, identity_schema_version, identity_hash, raw_event_id,
          raw_hash, canonical_hash, canonical_json, interpretation_status,
          provenance_json, stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canonical.evidence_id,
          canonical.identity_reference.identity_schema_version,
          canonical.identity_reference.identity_hash,
          raw.event_id,
          rawHash,
          canonicalHash,
          JSON.stringify(canonical),
          canonical.interpretation_status,
          JSON.stringify(canonical.provenance_reference),
          new Date().toISOString(),
        ]
      );

      return { inserted: true, evidenceId: canonical.evidence_id, rawHash, canonicalHash };
    },

    verify(evidenceId) {
      const record = this.get(evidenceId);
      if (!record) return { verified: false, reason: 'EVIDENCE_NOT_FOUND' };

      const rawResult = db.exec(
        `SELECT event_id, chain_id, block_number, transaction_hash, block_hash,
                transaction_index, log_index, address, topics_json, data, captured_at
         FROM raw_events
         WHERE event_id = ?`,
        [record.raw_event_id]
      );

      if (!rawResult.length || !rawResult[0].values.length) {
        return { verified: false, reason: 'RAW_EVIDENCE_NOT_FOUND' };
      }

      const columns = rawResult[0].columns;
      const row = rawResult[0].values[0];
      const raw = Object.fromEntries(columns.map((column, index) => [column, row[index]]));
      raw.topics = JSON.parse(raw.topics_json);
      delete raw.topics_json;

      const rawHash = hashRawEvidence(raw);
      if (rawHash !== record.raw_hash) {
        return { verified: false, reason: 'RAW_HASH_MISMATCH' };
      }

      const canonicalHash = hashCanonicalEvidence(record.canonical);
      if (canonicalHash !== record.canonical_hash) {
        return { verified: false, reason: 'CANONICAL_HASH_MISMATCH' };
      }

      const identity = createEvidenceIdentity(record.canonical);
      if (
        identity.evidence_id !== record.evidence_id ||
        identity.identity_hash !== record.identity_hash
      ) {
        return { verified: false, reason: 'IDENTITY_MISMATCH' };
      }

      if (record.canonical.raw_reference?.event_id !== raw.event_id) {
        return { verified: false, reason: 'RAW_REFERENCE_MISMATCH' };
      }

      return {
        verified: true,
        evidenceId: record.evidence_id,
        rawHash,
        canonicalHash,
        identityHash: identity.identity_hash,
      };
    },

    get(evidenceId) {
      const result = db.exec(
        'SELECT * FROM canonical_evidence WHERE evidence_id = ?',
        [evidenceId]
      );
      if (!result.length || !result[0].values.length) return null;

      const columns = result[0].columns;
      const row = result[0].values[0];
      const record = Object.fromEntries(columns.map((column, index) => [column, row[index]]));

      return {
        ...record,
        canonical: JSON.parse(record.canonical_json),
        provenance: JSON.parse(record.provenance_json),
      };
    },

    count() {
      const result = db.exec('SELECT COUNT(*) FROM canonical_evidence');
      return result[0].values[0][0];
    },
  };
}

module.exports = { createEvidenceRepository };
