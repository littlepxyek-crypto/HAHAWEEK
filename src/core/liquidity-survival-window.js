'use strict';

function isObservationWindowClosed(latestBlockTimestampSeconds, observationEndMs) {
  if (!Number.isFinite(latestBlockTimestampSeconds) || latestBlockTimestampSeconds < 0) {
    throw new Error('INVALID_LATEST_BLOCK_TIMESTAMP');
  }
  if (!Number.isFinite(observationEndMs) || observationEndMs < 0) {
    throw new Error('INVALID_OBSERVATION_END');
  }
  return latestBlockTimestampSeconds * 1000 >= observationEndMs;
}

module.exports = { isObservationWindowClosed };
