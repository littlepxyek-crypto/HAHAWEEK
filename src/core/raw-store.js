'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR =
  process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data');
const RAW_FILE =
  process.env.HAHAWEEK_RAW_FILE || path.join(DATA_DIR, 'raw-events.jsonl');

let eventIndex = null;
let indexedFileSignature = null;

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

function getFileSignature() {
  if (!fs.existsSync(RAW_FILE)) {
    return null;
  }

  const stat = fs.statSync(RAW_FILE);

  return `${stat.size}:${stat.mtimeMs}`;
}

function buildEventIndex() {
  const ids = new Set();

  if (fs.existsSync(RAW_FILE)) {
    const content = fs.readFileSync(RAW_FILE, 'utf8');

    for (const line of content.split('\n')) {
      if (!line) continue;

      try {
        const record = JSON.parse(line);

        if (record.event_id) {
          ids.add(record.event_id);
        }
      } catch {
        // Preserve the append-only raw file if a historical line is malformed.
      }
    }
  }

  eventIndex = ids;
  indexedFileSignature = getFileSignature();

  return eventIndex;
}

function ensureEventIndex() {
  const currentSignature = getFileSignature();

  if (
    eventIndex === null ||
    indexedFileSignature !== currentSignature
  ) {
    buildEventIndex();
  }

  return eventIndex;
}

function appendUnique(log, chainId) {
  ensureDir();

  const id = eventId(log, chainId);
  const ids = ensureEventIndex();

  if (ids.has(id)) {
    return {
      inserted: false,
      eventId: id,
    };
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

  ids.add(id);
  indexedFileSignature = getFileSignature();

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
