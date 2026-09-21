'use strict';

const RESULTS = Object.freeze({
  VALID: 'VALID',
  INVALID_INPUT: 'INVALID_INPUT',
  CONFLICT: 'CONFLICT'
});

function validateBlockIdentity(input) {
  if (!input || typeof input !== 'object') return RESULTS.INVALID_INPUT;
  if (!Number.isInteger(input.chainId) || input.chainId <= 0) return RESULTS.INVALID_INPUT;
  if (!Number.isInteger(input.blockNumber) || input.blockNumber < 0) return RESULTS.INVALID_INPUT;
  if (typeof input.blockHash !== 'string' || input.blockHash.length === 0) return RESULTS.INVALID_INPUT;
  if (typeof input.parentHash !== 'string' || input.parentHash.length === 0) return RESULTS.INVALID_INPUT;
  if (typeof input.observedAt !== 'string' || input.observedAt.length === 0) return RESULTS.INVALID_INPUT;
  return RESULTS.VALID;
}

function identityKey(input) {
  if (validateBlockIdentity(input) !== RESULTS.VALID) {
    throw new Error('INVALID_BLOCK_IDENTITY');
  }
  return input.chainId + ':' + input.blockNumber;
}

function sameIdentity(a, b) {
  return validateBlockIdentity(a) === RESULTS.VALID &&
    validateBlockIdentity(b) === RESULTS.VALID &&
    identityKey(a) === identityKey(b) &&
    a.blockHash === b.blockHash &&
    a.parentHash === b.parentHash;
}

function classify(existing, incoming) {
  const existingStatus = validateBlockIdentity(existing);
  const incomingStatus = validateBlockIdentity(incoming);
  if (existingStatus !== RESULTS.VALID || incomingStatus !== RESULTS.VALID) {
    return RESULTS.INVALID_INPUT;
  }
  if (identityKey(existing) !== identityKey(incoming)) return RESULTS.VALID;
  return sameIdentity(existing, incoming) ? RESULTS.VALID : RESULTS.CONFLICT;
}

module.exports = { RESULTS, validateBlockIdentity, identityKey, sameIdentity, classify };
