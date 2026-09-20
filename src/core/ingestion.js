'use strict';

const { getSafeHead } = require('./confirmation');
const { rpcCall } = require('./rpc-call');

class IngestionEngine {
  constructor({ provider, cursor, confirmations, processor, processorRange, batchSize, maxBatchesPerRun, v4CursorAdapter }) {
    if (!provider) throw new Error('PROVIDER_REQUIRED');
    if (!cursor) throw new Error('CURSOR_REQUIRED');
    if (!processor) throw new Error('PROCESSOR_REQUIRED');
    if (!Number.isInteger(confirmations) || confirmations < 0) throw new Error('INVALID_CONFIRMATIONS');
    if (processorRange !== undefined && typeof processorRange !== 'function') throw new Error('INVALID_PROCESSOR_RANGE');
    if (batchSize !== undefined && (!Number.isInteger(batchSize) || batchSize <= 0)) throw new Error('INVALID_BATCH_SIZE');
    if (maxBatchesPerRun !== undefined && (!Number.isInteger(maxBatchesPerRun) || maxBatchesPerRun <= 0)) throw new Error('INVALID_MAX_BATCHES_PER_RUN');
    if (processorRange !== undefined && batchSize === undefined) throw new Error('BATCH_SIZE_REQUIRED');
    if (v4CursorAdapter !== undefined && (typeof v4CursorAdapter.get !== 'function' || typeof v4CursorAdapter.advance !== 'function')) throw new Error('INVALID_V4_CURSOR_ADAPTER');
    this.provider=provider; this.cursor=cursor; this.confirmations=confirmations; this.processor=processor; this.processorRange=processorRange; this.batchSize=batchSize; this.maxBatchesPerRun=maxBatchesPerRun ?? Infinity; this.v4CursorAdapter=v4CursorAdapter; this.running=false;
  }
  getActiveCursor() { return this.v4CursorAdapter || this.cursor; }
  async runOnce() {
    if (this.running) throw new Error('INGESTION_ALREADY_RUNNING');
    this.running=true;
    try {
      const latestBlock=await rpcCall(()=>this.provider.getBlockNumber());
      const safeHead=getSafeHead(latestBlock,this.confirmations);
      const activeCursor=this.getActiveCursor();
      let current=activeCursor.get();
      if (current===null) { current=safeHead; if (!this.v4CursorAdapter) this.cursor.initialize(current); else throw new Error('V4_CURSOR_INITIALIZATION_REQUIRED'); return {processed:0,latestBlock,safeHead,cursor:current}; }
      if (current>=safeHead) return {processed:0,latestBlock,safeHead,cursor:current};
      let processed=0;
      if (typeof this.processorRange==='function') {
        let batchesProcessed=0;
        for (let fromBlock=current+1; fromBlock<=safeHead && batchesProcessed<this.maxBatchesPerRun; fromBlock+=this.batchSize) {
          const toBlock=Math.min(fromBlock+this.batchSize-1,safeHead);
          await this.processorRange(fromBlock,toBlock);
          activeCursor.advance(toBlock);
          processed+=toBlock-fromBlock+1; batchesProcessed+=1;
        }
      } else {
        for (let block=current+1; block<=safeHead; block+=1) { await this.processor(block); activeCursor.advance(block); processed+=1; }
      }
      return {processed,latestBlock,safeHead,cursor:activeCursor.get()};
    } finally { this.running=false; }
  }
}

module.exports={IngestionEngine};