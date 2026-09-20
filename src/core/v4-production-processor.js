'use strict';

/*
 * V4 production processor boundary.
 *
 * Evidence mutation belongs inside IngestionEngine's SQLite transaction.
 * This processor intentionally does not call database.save().
 */
function createV4ProductionProcessors({ rawLogs, filterFactory }) {
  if (!rawLogs || typeof rawLogs.ingestRange !== 'function') {
    throw new Error('V4_RAW_LOGS_REQUIRED');
  }
  if (typeof filterFactory !== 'function') {
    throw new Error('V4_FILTER_FACTORY_REQUIRED');
  }

  async function processRange(fromBlock, toBlock) {
    return rawLogs.ingestRange(fromBlock, toBlock, filterFactory());
  }

  return {
    processor: block => processRange(block, block),
    processorRange: processRange,
  };
}

module.exports = { createV4ProductionProcessors };
