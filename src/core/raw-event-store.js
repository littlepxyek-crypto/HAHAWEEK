'use strict';

const { createLegacyWriteBarrier } = require('./legacy-write-freeze');
const { rawEventDigest } = require('./raw-event-digest');

function createRawEventStore(db, options = {}) {
  if (!db) throw new Error('DATABASE_REQUIRED');

  const legacyWriteBarrier =
    options.legacyWriteBarrier || createLegacyWriteBarrier();

  const insertSql = `
    INSERT OR IGNORE INTO raw_events (
      event_id, chain_id, block_number, transaction_hash, block_hash,
      transaction_index, log_index, address, topics_json, data, captured_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return {
    insert(record) {
      if (!record || typeof record !== 'object') {
        throw new Error('RAW_EVENT_REQUIRED');
      }

      const digest = rawEventDigest(record);
      const existing = db.exec(
        'SELECT chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data FROM raw_events WHERE event_id = ?',
        [record.event_id]
      );

      if (existing.length && existing[0].values.length) {
        const row = existing[0].values[0];
        const existingDigest = rawEventDigest({
          chain_id: row[0], block_number: row[1], transaction_hash: row[2],
          block_hash: row[3], transaction_index: row[4], log_index: row[5],
          address: row[6], topics: JSON.parse(row[7]), data: row[8],
        });
        if (existingDigest !== digest) throw new Error('INTEGRITY_CONFLICT');
        return { inserted: false, eventId: record.event_id, digest, status: 'IDEMPOTENT' };
      }

      legacyWriteBarrier.assertWritable();

      db.run(insertSql, [
        record.event_id,
        record.chain_id,
        record.block_number,
        record.transaction_hash,
        record.block_hash ?? null,
        record.transaction_index ?? null,
        record.log_index,
        record.address,
        JSON.stringify(record.topics),
        record.data,
        record.captured_at,
      ]);

      const changes = db.getRowsModified();

      if (changes !== 1) {
        const concurrent = db.exec(
          'SELECT chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data FROM raw_events WHERE event_id = ?',
          [record.event_id]
        );
        if (concurrent.length && concurrent[0].values.length) {
          const row = concurrent[0].values[0];
          const existingDigest = rawEventDigest({
            chain_id: row[0], block_number: row[1], transaction_hash: row[2],
            block_hash: row[3], transaction_index: row[4], log_index: row[5],
            address: row[6], topics: JSON.parse(row[7]), data: row[8],
          });
          if (existingDigest !== digest) throw new Error('INTEGRITY_CONFLICT');
          return { inserted: false, eventId: record.event_id, digest, status: 'IDEMPOTENT' };
        }
        throw new Error('RAW_EVENT_INSERT_UNCONFIRMED');
      }

      return { inserted: true, eventId: record.event_id, digest, status: 'INSERTED' };
    },

    count() {
      const result = db.exec('SELECT COUNT(*) FROM raw_events');
      return result[0].values[0][0];
    },
  };
}

module.exports = {
  createRawEventStore,
};
