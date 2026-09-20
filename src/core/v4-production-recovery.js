'use strict';

const { loadLatestAuthorityRecord } = require('./v4-authority-store');
const { loadManifest, loadCheckpoint, loadAuthoritativeCursor } = require('./v4-production-authority-store');
const { assertRecoveryAuthority } = require('./v4-checkpoint-authority');

function recoverPersistedAuthority(database) {
  if (!database || !database.db) throw new Error('V4_DATABASE_REQUIRED');

  const record = loadLatestAuthorityRecord(database);
  if (!record) throw new Error('V4_AUTHORITY_RECORD_MISSING');

  const manifest = loadManifest(database, record.manifest_hash);
  if (!manifest) throw new Error('V4_MANIFEST_MISSING');

  const checkpoint = loadCheckpoint(database, record.checkpoint_hash);
  if (!checkpoint) throw new Error('V4_CHECKPOINT_MISSING');

  const cursor = {
    input: record.cursor_input,
    hash: record.cursor_hash,
  };

  assertRecoveryAuthority({
    manifest,
    checkpoint,
    cursor,
    acquisitionPositionValid: record.acquisition_position_valid,
  });

  loadAuthoritativeCursor(database, cursor);

  return { record, manifest, checkpoint, cursor };
}

module.exports = { recoverPersistedAuthority };
