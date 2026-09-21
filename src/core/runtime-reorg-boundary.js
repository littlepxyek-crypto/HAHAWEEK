'use strict';

const { RESULTS: REORG, detectReorg } = require('./reorg-detector');

const RESULTS = Object.freeze({ CONTINUE: 'CONTINUE', STOP_REORG: 'STOP_REORG', FAIL_CLOSED: 'FAIL_CLOSED' });

function evaluateRuntimeBoundary({ previous, current }) {
  if (!previous || !current) return { result: RESULTS.FAIL_CLOSED, detectorResult: REORG.INVALID_INPUT };
  const detectorResult = detectReorg({ previousBlockNumber: previous.blockNumber, previousHash: previous.blockHash, currentBlockNumber: current.blockNumber, currentHash: current.blockHash, currentParentHash: current.parentHash });
  if (detectorResult === REORG.CONTINUOUS) return { result: RESULTS.CONTINUE, detectorResult };
  if (detectorResult === REORG.REORG_DETECTED) return { result: RESULTS.STOP_REORG, detectorResult };
  return { result: RESULTS.FAIL_CLOSED, detectorResult };
}

module.exports = { RESULTS, evaluateRuntimeBoundary };
