'use strict';

const crypto = require('node:crypto');

function digest(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function classifyReplay({ identity, digest: evidenceDigest, existing }) {
  if (!existing) return Object.freeze({ classification: 'NEW' });

  if (existing.identity !== identity) {
    return Object.freeze({ classification: 'DIFFERENT_IDENTITY' });
  }

  if (existing.digest === evidenceDigest) {
    return Object.freeze({ classification: 'IDEMPOTENT_REPLAY' });
  }

  return Object.freeze({
    classification: 'IDENTITY_COLLISION',
    code: 'EVIDENCE_IDENTITY_CONFLICT',
  });
}

function assertNoCollision(result) {
  if (!result || result.classification === 'IDENTITY_COLLISION') {
    throw new Error('EVIDENCE_IDENTITY_CONFLICT');
  }
  return true;
}

module.exports = {
  digest,
  classifyReplay,
  assertNoCollision,
};
