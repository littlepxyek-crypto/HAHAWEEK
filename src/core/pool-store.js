'use strict';

const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

function createPoolStore(db, options = {}) {
  if (!db) {
    throw new Error('DATABASE_REQUIRED');
  }

  const legacyWriteBarrier = options.legacyWriteBarrier || createLegacyWriteBarrier();

  const exists = poolId => {
    const result = db.exec(`
      SELECT 1
      FROM pools
      WHERE pool_id = ?
      LIMIT 1
    `, [poolId.toLowerCase()]);

    return Boolean(
      result.length &&
      result[0].values.length
    );
  };

  return {
    insert(pool) {
      if (!pool || typeof pool !== 'object') {
        throw new Error('POOL_REQUIRED');
      }

      const poolId = pool.poolId.toLowerCase();

      if (exists(poolId)) {
        return {
          inserted: false,
          poolId,
        };
      }

      legacyWriteBarrier.assertWritable();

      db.run(`
        INSERT INTO pools (
          pool_id,
          chain_id,
          pool_manager,
          currency0,
          currency1,
          fee,
          tick_spacing,
          hooks,
          block_number,
          transaction_hash,
          log_index,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        poolId,
        pool.chainId,
        pool.poolManager.toLowerCase(),
        pool.currency0.toLowerCase(),
        pool.currency1.toLowerCase(),
        pool.fee,
        pool.tickSpacing,
        pool.hooks.toLowerCase(),
        pool.blockNumber,
        pool.transactionHash.toLowerCase(),
        pool.logIndex,
        pool.createdAt || new Date().toISOString(),
      ]);

      return {
        inserted: true,
        poolId,
      };
    },

    get(poolId) {
      const result = db.exec(`
        SELECT
          pool_id,
          chain_id,
          pool_manager,
          currency0,
          currency1,
          fee,
          tick_spacing,
          hooks,
          block_number,
          transaction_hash,
          log_index,
          created_at
        FROM pools
        WHERE pool_id = ?
      `, [poolId.toLowerCase()]);

      if (!result.length || !result[0].values.length) {
        return null;
      }

      const row = result[0].values[0];

      return {
        poolId: row[0],
        chainId: row[1],
        poolManager: row[2],
        currency0: row[3],
        currency1: row[4],
        fee: row[5],
        tickSpacing: row[6],
        hooks: row[7],
        blockNumber: row[8],
        transactionHash: row[9],
        logIndex: row[10],
        createdAt: row[11],
      };
    },

    count() {
      const result = db.exec(`
        SELECT COUNT(*) FROM pools
      `);

      return result[0].values[0][0];
    },
  };
}

module.exports = {
  createPoolStore,
};
