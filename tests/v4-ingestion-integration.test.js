'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {IngestionEngine}=require('../src/core/ingestion');
const v4Database={transactionAsync:async work=>work()};

function provider(head){return {async getBlockNumber(){return head;}};}

test('IngestionEngine uses V4 cursor adapter only when explicitly supplied', async()=>{
  const processed=[]; const calls=[];
  const adapter={get:()=>100,advance:(n)=>{calls.push(n);return n;},advanceInTransaction:(n)=>{calls.push(n);return n;}};
  const engine=new IngestionEngine({provider:provider(102),cursor:{get:()=>999,advance:()=>{throw new Error('LEGACY_CURSOR_USED');}},confirmations:0,processor:async b=>processed.push(b),v4CursorAdapter:adapter,v4Database});
  const result=await engine.runOnce();
  assert.deepEqual(processed,[101,102]); assert.deepEqual(calls,[101,102]); assert.equal(result.cursor,102);
});

test('IngestionEngine does not advance V4 cursor after processor failure', async()=>{
  const calls=[]; const adapter={get:()=>100,advance:n=>calls.push(n),advanceInTransaction:n=>calls.push(n)};
  const engine=new IngestionEngine({provider:provider(102),cursor:{get:()=>999,advance:()=>{}},confirmations:0,processor:async b=>{if(b===102) throw new Error('PROCESSING_FAILURE');},v4CursorAdapter:adapter});
  await assert.rejects(()=>engine.runOnce(),/PROCESSING_FAILURE/);
  assert.deepEqual(calls,[101]);
});

test('IngestionEngine refuses implicit V4 initialization', async()=>{
  const adapter={get:()=>null,advance:()=>{},advanceInTransaction:()=>{}};
  const engine=new IngestionEngine({provider:provider(100),cursor:{get:()=>null,initialize:()=>{throw new Error('LEGACY_INIT_USED');}},confirmations:0,processor:async()=>{},v4CursorAdapter:adapter});
  await assert.rejects(()=>engine.runOnce(),/V4_CURSOR_INITIALIZATION_REQUIRED/);
});