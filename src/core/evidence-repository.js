'use strict';

const { hashRawEvidence, hashCanonicalEvidence } = require('./evidence-identity');

function createEvidenceRepository(db) {
  if (!db) throw new Error('DATABASE_REQUIRED');

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
