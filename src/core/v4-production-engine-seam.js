'use strict';

const { recoverPersistedAuthority } = require('./v4-production-recovery');
const { V4BlockCursorAdapter } = require('./v4-block-cursor-adapter');

function createV4ProductionCursor({ database }) {
  const recovered = recoverPersistedAuthority(database);
  const cursor = new V4BlockCursorAdapter({
    database,
    authorityRecord: recovered.record,
    authorityContext: {
      manifest: recovered.manifest,
      checkpoint: recovered.checkpoint,
    },
  });

  return { cursor, recovered };
}


function createV4ProductionIngestionEngine({ database, provider, confirmations, processor, processorRange, batchSize, maxBatchesPerRun }) {
  const { IngestionEngine } = require('./ingestion');
  const { cursor } = createV4ProductionCursor({ database });
  return new IngestionEngine({
    provider,
    cursor,
    confirmations,
    processor,
    processorRange,
    batchSize,
    maxBatchesPerRun,
    v4CursorAdapter: cursor,
    v4Database: database,
  });
}

module.exports = { createV4ProductionCursor, createV4ProductionIngestionEngine };

