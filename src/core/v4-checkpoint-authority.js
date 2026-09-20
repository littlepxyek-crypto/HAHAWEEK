'use strict';

const UINT64_RE = /^(0|[1-9][0-9]*)$/;
const UINT64_MAX = 18446744073709551615n;
const HASH32_RE = /^0x[0-9a-f]{64}$/;

function validUint64(value) {
  return (
    typeof value === 'string' &&
    UINT64_RE.test(value) &&
    BigInt(value) <= UINT64_MAX
  );
}

function validHash(value) {
  return typeof value === 'string' && HASH32_RE.test(value);
}

function assertCheckpointAuthority(checkpoint, manifest) {
  if (!checkpoint || !manifest) {
    throw new Error('CHECKPOINT_AUTHORITY_INVALID');
  }

  const input = checkpoint.input;

  if (!input || Object.keys(input).sort().join(',') !== 'generation,manifest_hash') {
    throw new Error('CHECKPOINT_AUTHORITY_INVALID');
  }

  if (!validUint64(input.generation) || !validHash(input.manifest_hash)) {
    throw new Error('CHECKPOINT_AUTHORITY_INVALID');
  }

  if (!manifest.exists ||
      manifest.hash !== input.manifest_hash ||
      manifest.generation !== input.generation ||
      manifest.inventory_valid !== true ||
      manifest.segments_valid !== true) {
    throw new Error('CHECKPOINT_AUTHORITY_INVALID');
  }

  return true;
}

function assertCursorAuthority(cursor, checkpoint) {
  if (!cursor || !checkpoint) {
    throw new Error('CURSOR_AUTHORITY_INVALID');
  }

  const input = cursor.input;

  if (!input ||
      Object.keys(input).sort().join(',') !==
        'checkpoint_hash,generation,position') {
    throw new Error('CURSOR_AUTHORITY_INVALID');
  }

  if (!validUint64(input.generation) ||
      !validUint64(input.position) ||
      !validHash(input.checkpoint_hash)) {
    throw new Error('CURSOR_AUTHORITY_INVALID');
  }

  if (input.checkpoint_hash !== checkpoint.hash) {
    throw new Error('CURSOR_AUTHORITY_INVALID');
  }

  if (BigInt(input.generation) > BigInt(checkpoint.generation)) {
    throw new Error('CURSOR_AUTHORITY_INVALID');
  }

  return true;
}

function assertRecoveryAuthority({
  manifest,
  checkpoint,
  cursor,
  acquisitionPositionValid,
}) {
  assertCheckpointAuthority(checkpoint, manifest);
  assertCursorAuthority(cursor, checkpoint);

  if (acquisitionPositionValid !== true) {
    throw new Error('RECOVERY_AUTHORITY_INVALID');
  }

  return true;
}

function authorizeCursorAdvance({
  currentCursor,
  targetPosition,
  manifest,
  checkpoint,
  cursor,
  acquisitionPositionValid,
}) {
  assertRecoveryAuthority({
    manifest,
    checkpoint,
    cursor,
    acquisitionPositionValid,
  });

  if (!validUint64(String(targetPosition))) {
    throw new Error('CURSOR_TARGET_INVALID');
  }

  if (
    currentCursor !== null &&
    BigInt(String(targetPosition)) < BigInt(String(currentCursor))
  ) {
    throw new Error('BLOCK_CURSOR_REGRESSION');
  }

  if (
    BigInt(String(targetPosition)) < BigInt(cursor.input.position)
  ) {
    throw new Error('CURSOR_TARGET_BEFORE_AUTHORITY');
  }

  return {
    authorized: true,
    position: String(targetPosition),
    checkpointHash: checkpoint.hash,
    generation: cursor.input.generation,
  };
}

module.exports = {
  validUint64,
  validHash,
  assertCheckpointAuthority,
  assertCursorAuthority,
  assertRecoveryAuthority,
  authorizeCursorAdvance,
};
