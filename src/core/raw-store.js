'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const RAW_FILE = path.join(DATA_DIR, 'raw-events.jsonl');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function eventId(log, chainId) {
  return [
    chainId,
    log.blockNumber,
    log.transactionHash,
    log.index ?? log.logIndex ?? 0,
  ].join(':');
}

function appendUnique(log, chainId) {
  ensureDir();

  const id = eventId(log, chainId);

  if (fs.existsSync(RAW_FILE)) {
    const content = fs.readFileSync(RAW_FILE, 'utf8');

    if (content.includes(`"event_id":"${id}"`)) {
      return {
        inserted: false,
        eventId: id,
      };
    }
  }

  const record = {
    event_id: id,
    chain_id: chainId,
    block_number: log.blockNumber,
    transaction_hash: log.transactionHash,
    log_index: log.index ?? log.logIndex ?? 0,
    address: log.address,
    topics: log.topics,
    data: log.data,
    captured_at: new Date().toISOString(),
  };

  fs.appendFileSync(
    RAW_FILE,
    JSON.stringify(record) + '\n'
  );

  return {
    inserted: true,
    eventId: id,
  };
}

module.exports = {
  RAW_FILE,
  eventId,
  appendUnique,
};
