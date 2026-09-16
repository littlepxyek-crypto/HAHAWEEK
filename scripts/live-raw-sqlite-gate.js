'use strict';

const { createProvider } = require('../src/core/rpc');
const { RawLogIngestion } = require('../src/core/raw-log-ingestion');
const { createDatabase } = require('../src/core/database');
const { eventId } = require('../src/core/raw-store');

(async () => {
  const provider = createProvider();
  const database = await createDatabase();
  const db = database.db;

  const poolManager =
    '0x8366a39cc670b4001a1121b8f6a443a643e40951';

  const latest = await provider.getBlockNumber();

  const fromBlock = latest - 4;
  const toBlock = latest;

  const appendUnique = (log, chainId) => {
    const id = eventId(log, chainId);

    db.run(`
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
    `, [
      id,
      chainId,
      log.blockNumber,
      log.transactionHash,
      log.index ?? log.logIndex ?? 0,
      log.address,
      JSON.stringify(log.topics),
      log.data,
      new Date().toISOString(),
    ]);

    return {
      inserted: db.getRowsModified() === 1,
      eventId: id,
    };
  };

  const ingestion = new RawLogIngestion({
    provider,
    appendUnique,
    chainId: 4663,
    chunkSize: 2,
  });

  console.log('=== LIVE RAW → SQLITE GATE ===');
  console.log(`Chain ID: 4663`);
  console.log(`PoolManager: ${poolManager}`);
  console.log(`Range: ${fromBlock} -> ${toBlock}`);

  const first = await ingestion.ingestRange(
    fromBlock,
    toBlock,
    { address: poolManager }
  );

  database.save();

  console.log('');
  console.log('=== FIRST PASS ===');
  console.log(`Fetched: ${first.fetched}`);
  console.log(`Inserted: ${first.inserted}`);
  console.log(`Duplicates: ${first.duplicates}`);

  const second = await ingestion.ingestRange(
    fromBlock,
    toBlock,
    { address: poolManager }
  );

  database.save();

  console.log('');
  console.log('=== REPLAY ===');
  console.log(`Fetched: ${second.fetched}`);
  console.log(`Inserted: ${second.inserted}`);
  console.log(`Duplicates: ${second.duplicates}`);

  const countResult = db.exec(`
    SELECT COUNT(*)
    FROM raw_events
  `);

  const persistedRows =
    countResult[0].values[0][0];

  console.log('');
  console.log('=== SQLITE ===');
  console.log(`Persisted raw rows: ${persistedRows}`);

  database.close();
  provider.destroy();

  if (
    first.fetched !== second.fetched ||
    second.inserted !== 0 ||
    second.duplicates !== second.fetched ||
    persistedRows < first.inserted
  ) {
    throw new Error('LIVE_RAW_SQLITE_GATE_FAILED');
  }

  console.log('');
  console.log(
    'RAW RPC → SQLITE → REPLAY → DEDUP: OK'
  );
  console.log('LIVE RAW → SQLITE: OK');
})().catch(error => {
  console.error('LIVE RAW → SQLITE: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
