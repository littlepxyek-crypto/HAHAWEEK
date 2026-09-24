'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {assertAuthorityContinuity}=require('../src/core/f03-production-authority-record');

test('F-03 rejects conflicting authority generations',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {generation:'g1',cursorBlock:100},
    {generation:'g2',cursorBlock:101}
  ),/AUTHORITY_GENERATION_CONFLICT/);
});

test('F-03 rejects authority cursor regression',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {generation:'g1',cursorBlock:101},
    {generation:'g1',cursorBlock:100}
  ),/AUTHORITY_REGRESSION/);
});

test('F-03 accepts same-generation monotonic authority',()=>{
  assert.deepEqual(assertAuthorityContinuity(
    {generation:'g1',cursorBlock:100},
    {generation:'g1',cursorBlock:101}
  ),{status:'CONTINUOUS',generation:'g1',cursorBlock:101});
});
