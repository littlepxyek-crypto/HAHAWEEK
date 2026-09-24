'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {createEngine}=require('../src/index');

test('F-03 production createEngine accepts complete authority factory',async()=>{
  const engine=await createEngine({
    authorityFactory:({fromBlock,toBlock})=>({
      segmentId:`seg-${fromBlock}-${toBlock}`,
      manifestDigest:'m101',
      checkpointDigest:'c101',
      generation:'g1',
      cursorBlock:toBlock,
    }),
  });
  assert.equal(typeof engine.ingestion.authorityGate,'function');
  engine.database.close(); engine.writerFence.release(); engine.provider.destroy();
});

test('F-03 production createEngine fails closed without authority source',async()=>{
  const engine=await createEngine();
  try {
    await assert.rejects(
      ()=>engine.ingestion.runOnce(),
      /AUTHORITY_SOURCE_REQUIRED/
    );
  } finally {
    engine.database.close(); engine.writerFence.release(); engine.provider.destroy();
  }
});
