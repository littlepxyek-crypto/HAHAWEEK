"use strict";

const RESULTS = Object.freeze({
  CONTINUOUS: "CONTINUOUS",
  REORG_DETECTED: "REORG_DETECTED",
  INVALID_INPUT: "INVALID_INPUT",
});

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function detectReorg(input) {
  if (!input || typeof input !== "object") {
    return RESULTS.INVALID_INPUT;
  }

  const {
    previousBlockNumber,
    previousHash,
    currentBlockNumber,
    currentHash,
    currentParentHash,
  } = input;

  if (
    !isNonNegativeInteger(previousBlockNumber) ||
    !isNonNegativeInteger(currentBlockNumber) ||
    !isNonEmptyString(previousHash) ||
    !isNonEmptyString(currentHash) ||
    !isNonEmptyString(currentParentHash)
  ) {
    return RESULTS.INVALID_INPUT;
  }

  if (currentBlockNumber !== previousBlockNumber + 1) {
    return RESULTS.INVALID_INPUT;
  }

  return currentParentHash === previousHash
    ? RESULTS.CONTINUOUS
    : RESULTS.REORG_DETECTED;
}

module.exports = {
  RESULTS,
  detectReorg,
};
