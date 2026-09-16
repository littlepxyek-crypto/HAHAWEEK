'use strict';

function createRawEventStore(db) {
  if (!db) {
    throw new Error('DATABASE_REQUIRED');
  }

  const insertSql = `
    INSERT OR IGNORE INTO raw_events (
      event_id,
      chain_id,
      block_number,
      transaction_hash,
      log_index,
      address,
      topics_json,
      data,
      captured_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return {
    insert(record) {
      if (!record || typeof record !== 'object') {
        throw new Error('RAW_EVENT_REQUIRED');
      }

      db.run(insertSql, [
        record.event_id,
        record.chain_id,
        record.block_number,
        record.transaction_hash,
        record.log_index,
        record.address,
        JSON.stringify(record.topics),
        record.data,
        record.captured_at,
      ]);

      const changes = db.getRowsModified();

      return {
        inserted: changes === 1,
        eventId: record.event_id,
      };
    },

    count() {
      const result = db.exec(`
        SELECT COUNT(*)
        FROM raw_events
      `);

      return result[0].values[0][0];
    },
  };
}

module.exports = {
  createRawEventStore,
};
