'use strict';

function assertProductionAuthority(record) {
  if (!record || typeof record !== 'object') throw new Error('AUTHORITY_MISSING');
  const required = ['segmentId','manifestDigest','checkpointDigest','generation','cursorBlock'];
  for (const key of required) {
    if (record[key] === undefined || record[key] === null || record[key] === '') throw new Error('AUTHORITY_' + key.toUpperCase() + '_MISSING');
  }
  if (!Number.isInteger(record.cursorBlock) || record.cursorBlock < 0) throw new Error('AUTHORITY_CURSOR_INVALID');
  return { status:'AUTHORIZED', segmentId:record.segmentId, manifestDigest:record.manifestDigest, checkpointDigest:record.checkpointDigest, generation:record.generation, cursorBlock:record.cursorBlock };
}
function assertAuthorityContinuity(previous, next) {
  if (!previous || !next) throw new Error('AUTHORITY_MISSING');
  if (next.generation !== previous.generation) throw new Error('AUTHORITY_GENERATION_CONFLICT');
  if (next.segmentId !== previous.segmentId) throw new Error('AUTHORITY_SEGMENT_CONFLICT');
  if (next.manifestDigest !== previous.manifestDigest) throw new Error('AUTHORITY_MANIFEST_CONFLICT');
  if (next.checkpointDigest !== previous.checkpointDigest) throw new Error('AUTHORITY_CHECKPOINT_CONFLICT');
  if (next.cursorBlock < previous.cursorBlock) throw new Error('AUTHORITY_REGRESSION');
  return {
    status:'CONTINUOUS',
    segmentId:next.segmentId,
    manifestDigest:next.manifestDigest,
    checkpointDigest:next.checkpointDigest,
    generation:next.generation,
    cursorBlock:next.cursorBlock,
  };
}
module.exports={assertProductionAuthority,assertAuthorityContinuity};
