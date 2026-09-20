'use strict';

const { createV4ProductionIngestionEngine } = require('./v4-production-engine-seam');
const { createV4ProductionProcessors } = require('./v4-production-processor');

function createV4ProductionFactory({ database, provider, confirmations, rawLogs, filterFactory, batchSize, maxBatchesPerRun }) {
  if (!database || !database.db) throw new Error('V4_DATABASE_REQUIRED');
  if (!provider) throw new Error('PROVIDER_REQUIRED');
  const processors = createV4ProductionProcessors({ rawLogs, filterFactory });

  return {
    processors,
    createEngine() {
      return createV4ProductionIngestionEngine({
        database,
        provider,
        confirmations,
        processor: processors.processor,
        processorRange: processors.processorRange,
        batchSize,
        maxBatchesPerRun,
      });
    },
  };
}

module.exports = { createV4ProductionFactory };
