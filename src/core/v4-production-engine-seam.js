'use strict';

const { recoverPersistedAuthority } = require('./v4-production-recovery');
const { V4BlockCursorAdapter } = require('./v4-block-cursor-adapter');
const { createV4ProductionProcessors } = require('./v4-production-processor');

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


function createV4ProductionIngestionEngine({ database, provider, confirmations, processor, processorRange, rawLogs, filterFactory, batchSize, maxBatchesPerRun }) {
  const { IngestionEngine } = require('./ingestion');
  const { cursor } = createV4ProductionCursor({ database });
  let resolvedProcessor = processor;
  let resolvedProcessorRange = processorRange;
  if (rawLogs || filterFactory) {
    const processors = createV4ProductionProcessors({ rawLogs, filterFactory });
    resolvedProcessor = processors.processor;
    resolvedProcessorRange = processors.processorRange;
  }
  if (typeof resolvedProcessor !== 'function') throw new Error('V4_PROCESSOR_REQUIRED');
  return new IngestionEngine({
    provider,
    cursor,
    confirmations,
    processor: resolvedProcessor,
    processorRange: resolvedProcessorRange,
    batchSize,
    maxBatchesPerRun,
    v4CursorAdapter: cursor,
    v4Database: database,
  });
}

module.exports = { createV4ProductionCursor, createV4ProductionIngestionEngine };

