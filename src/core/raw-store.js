'use strict';

const fs = require('fs');
const path = require('path');
const { createLegacyWriteBarrier } = require('./legacy-write-freeze');
const { rawEventDigest } = require('./raw-event-digest');

const DATA_DIR =
  process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data');
const RAW_FILE =
  process.env.HAHAWEEK_RAW_FILE || path.join(DATA_DIR, 'raw-events.jsonl');

let eventIndex = null;
let indexedFileSignature = null;
let indexedFilePath = null;

function ensureDir(dataDir = DATA_DIR) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function eventId(log, chainId) {
  return [
    chainId,
    log.blockNumber,
    log.transactionHash,
    log.index ?? log.logIndex ?? 0,
  ].join(':');
}

function getFileSignature(rawFile = RAW_FILE) {
  if (!fs.existsSync(rawFile)) return null;
  const stat = fs.statSync(rawFile);
  return stat.size + ':' + stat.mtimeMs;
}

function buildEventIndex(rawFile = RAW_FILE) {
  const ids = new Map();

  if (fs.existsSync(rawFile)) {
    const content = fs.readFileSync(rawFile, 'utf8');

    for (const line of content.split('\n')) {
      if (!line) continue;

      try {
        const record = JSON.parse(line);
        if (record.event_id) ids.set(record.event_id, rawEventDigest(record));
      } catch {
        // Preserve the append-only raw file if a historical line is malformed.
      }
    }
  }

  eventIndex = ids;
  indexedFileSignature = getFileSignature(rawFile);
  indexedFilePath = rawFile;
  return eventIndex;
}

function ensureEventIndex(rawFile = RAW_FILE) {
  const currentSignature = getFileSignature(rawFile);

  if (
    eventIndex === null ||
    indexedFilePath !== rawFile ||
    indexedFileSignature !== currentSignature
  ) {
    buildEventIndex(rawFile);
  }

  return eventIndex;
}

function appendUnique(log, chainId, options = {}) {
  const legacyWriteBarrier =
    options.legacyWriteBarrier || createLegacyWriteBarrier();
  const rawFile = options.rawFile || RAW_FILE;
  const dataDir = options.dataDir || path.dirname(rawFile);

  legacyWriteBarrier.assertWritable();
  ensureDir(dataDir);

  const id = eventId(log, chainId);
  const ids = ensureEventIndex(rawFile);

  const record = {
    event_id: id,
    chain_id: chainId,
    block_number: log.blockNumber,
    transaction_hash: log.transactionHash,
    block_hash: log.blockHash ?? null,
    transaction_index: log.transactionIndex ?? null,
    log_index: log.index ?? log.logIndex ?? 0,
    address: log.address,
    topics: log.topics,
    data: log.data,
    captured_at: new Date().toISOString(),
  };

  fs.appendFileSync(rawFile, JSON.stringify(record) + '\n');

  ids.set(id, digest);
  indexedFileSignature = getFileSignature(rawFile);

  return { inserted: true, eventId: id };
}

module.exports = {
  RAW_FILE,
  eventId,
  appendUnique,
};
