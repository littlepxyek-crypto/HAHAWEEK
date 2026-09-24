'use strict';

const crypto = require('crypto');

function rawEventDigest(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('RAW_EVENT_REQUIRED');
  }

  const material = {
    chain_id: record.chain_id,
    block_number: record.block_number,
    transaction_hash: record.transaction_hash,
    block_hash: record.block_hash ?? null,
    transaction_index: record.transaction_index ?? null,
    log_index: record.log_index ?? 0,
    address: record.address,
    topics: record.topics,
    data: record.data,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(material), 'utf8')
    .digest('hex');
}

module.exports = { rawEventDigest };
