'use strict';

const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

function createLiquidityStore(db, options = {}) {
  if (!db) {
    throw new Error('DATABASE_REQUIRED');
  }

  const legacyWriteBarrier = options.legacyWriteBarrier || createLegacyWriteBarrier();

  const exists = eventId => {
    const result = db.exec(`
      SELECT 1
      FROM liquidity_events
      WHERE event_id = ?
      LIMIT 1
    `, [eventId]);

    return Boolean(
      result.length &&
      result[0].values.length
    );
  };

  return {
    insert(event) {
      if (!event || typeof event !== 'object') {
        throw new Error('LIQUIDITY_EVENT_REQUIRED');
      }

      if (!event.identity) {
        throw new Error('LIQUIDITY_EVENT_ID_REQUIRED');
      }

      const eventId = event.identity;

      if (exists(eventId)) {
        return {
          inserted: false,
          eventId,
        };
      }

      legacyWriteBarrier.assertWritable();

      db.run(`
        INSERT INTO liquidity_events (
          event_id,
          chain_id,
          pool_id,
          pool_manager,
          sender,
          tick_lower,
          tick_upper,
          liquidity_delta,
          salt,
          block_number,
          transaction_hash,
          log_index,
          captured_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eventId,
        event.chainId,
        event.poolId.toLowerCase(),
        event.poolManager.toLowerCase(),
        event.sender.toLowerCase(),
        event.tickLower,
        event.tickUpper,
        String(event.liquidityDelta),
        event.salt.toLowerCase(),
        event.blockNumber,
        event.transactionHash.toLowerCase(),
        event.logIndex,
        event.capturedAt || new Date().toISOString(),
      ]);

      return {
        inserted: true,
        eventId,
      };
    },

    get(eventId) {
      const result = db.exec(`
        SELECT
          event_id,
          chain_id,
          pool_id,
          pool_manager,
          sender,
          tick_lower,
          tick_upper,
          liquidity_delta,
          salt,
          block_number,
          transaction_hash,
          log_index,
          captured_at
        FROM liquidity_events
        WHERE event_id = ?
      `, [eventId]);

      if (!result.length || !result[0].values.length) {
        return null;
      }

      const row = result[0].values[0];

      return {
        eventId: row[0],
        chainId: row[1],
        poolId: row[2],
        poolManager: row[3],
        sender: row[4],
        tickLower: row[5],
        tickUpper: row[6],
        liquidityDelta: row[7],
        salt: row[8],
        blockNumber: row[9],
        transactionHash: row[10],
        logIndex: row[11],
        capturedAt: row[12],
      };
    },

    count() {
      const result = db.exec(`
        SELECT COUNT(*)
        FROM liquidity_events
      `);

      return result[0].values[0][0];
    },
  };
}

module.exports = {
  createLiquidityStore,
};
