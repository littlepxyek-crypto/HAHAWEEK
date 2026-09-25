'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const TEST_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'hahaweek-f03-wiring-'));
process.env.HAHAWEEK_DATA_DIR=TEST_DATA_DIR;
process.env.HAHAWEEK_STATE_FILE=path.join(TEST_DATA_DIR,'state.json');
process.env.HAHAWEEK_RAW_FILE=path.join(TEST_DATA_DIR,'raw-events.jsonl');
const {createEngine}=require('../src/index');
function cleanup(engine){engine.database.close();engine.writerFence.release();engine.provider.destroy();}
test('F-03 production createEngine accepts complete authority factory',async()=>{
 const engine=await createEngine({authorityFactory:({fromBlock,toBlock})=>({segmentId:`seg-${fromBlock}-${toBlock}`,manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:toBlock})});
 try{assert.equal(typeof engine.ingestion.authorityGate,'function');}finally{cleanup(engine);}
});
test('F-03 production createEngine uses repository lifecycle source and fails closed without expected chain',async()=>{
 const engine=await createEngine();
 try{assert.throws(()=>engine.ingestion.authorityGate({checkpointCommitted:true,fromBlock:101,toBlock:101,processingContext:{status:'VERIFIED',fromBlock:101,toBlock:101,generation:'1'}}),/F03_CHAIN_NOT_FOUND/);}
 finally{cleanup(engine);}
});
