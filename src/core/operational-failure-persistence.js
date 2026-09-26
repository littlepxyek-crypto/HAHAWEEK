'use strict';

const { createWriterFence } = require('./single-writer-fence');
const { loadState, saveState } = require('./state');
const {
  classifyFailure,
  createFailureState,
} = require('./operational-state');

function persistOperationalFailure(error, options = {}) {
  const writerFence = createWriterFence({
    filename: options.writerFenceFile,
    ownerId: options.ownerId,
    leaseMs: options.leaseMs,
  });

  try {
    writerFence.acquire();

    const previous = loadState({ stateFile: options.stateFile });
    const failure = classifyFailure(error);
    const next = createFailureState({
      ...previous,
      status: 'FAILED',
      lastError:
        error instanceof Error
          ? error.message
          : String(error),
    }, failure);

    saveState(next, {
      stateFile: options.stateFile,
      legacyWriteBarrier: { assertWritable: () => writerFence.assertOwned() },
    });
    return failure;
  } finally {
    writerFence.release();
  }
}

module.exports = {
  persistOperationalFailure,
};
