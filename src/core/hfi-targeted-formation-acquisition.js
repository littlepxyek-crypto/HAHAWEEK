'use strict';

function orderEvents(a, b) {
  return (a.blockNumber ?? 0) - (b.blockNumber ?? 0) ||
    (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0) ||
    (a.logIndex ?? a.index ?? 0) - (b.logIndex ?? b.index ?? 0);
}

async function collectUntilFormationSequence({ start, end, chunkSize, fetchChunk, liquidityTopic, swapTopic }) {
  if (!Number.isSafeInteger(start) || start < 0) throw new Error('START_BLOCK_REQUIRED');
  if (!Number.isSafeInteger(end) || end < start) throw new Error('END_BLOCK_REQUIRED');
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) throw new Error('CHUNK_SIZE_REQUIRED');
  if (typeof fetchChunk !== 'function') throw new Error('FETCH_CHUNK_REQUIRED');
  const out = [];
  const liquidity = liquidityTopic.toLowerCase();
  const swap = swapTopic.toLowerCase();

  for (let from = start; from <= end; from += chunkSize) {
    const to = Math.min(end, from + chunkSize - 1);
    const chunk = await fetchChunk(from, to);
    if (!Array.isArray(chunk)) throw new Error('CHUNK_RESULT_REQUIRED');
    out.push(...chunk);
    const ordered = [...out].sort(orderEvents);
    let liquiditySeen = false;
    for (const event of ordered) {
      const topic = String(event?.topics?.[0] ?? '').toLowerCase();
      if (topic === liquidity) liquiditySeen = true;
      if (topic === swap && liquiditySeen) return ordered;
    }
  }

  return out.sort(orderEvents);
}

module.exports = { collectUntilFormationSequence };