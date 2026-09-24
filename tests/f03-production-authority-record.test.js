'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {assertProductionAuthority,assertAuthorityContinuity}=require('../src/core/f03-production-authority-record');
test('F-03 accepts complete production authority record',()=>assert.equal(assertProductionAuthority({segmentId:'s1',manifestDigest:'m1',checkpointDigest:'c1',generation:'g1',cursorBlock:100}).status,'AUTHORIZED'));
test('F-03 rejects missing authority fields',()=>assert.throws(()=>assertProductionAuthority({segmentId:'s1'}),/AUTHORITY_MANIFESTDIGEST_MISSING/));
test('F-03 rejects invalid cursor',()=>assert.throws(()=>assertProductionAuthority({segmentId:'s1',manifestDigest:'m1',checkpointDigest:'c1',generation:'g1',cursorBlock:-1}),/AUTHORITY_CURSOR_INVALID/));
test('F-03 rejects generation conflict',()=>assert.throws(()=>assertAuthorityContinuity({generation:'g1',cursorBlock:100},{generation:'g2',cursorBlock:101}),/AUTHORITY_GENERATION_CONFLICT/));
test('F-03 rejects cursor regression',()=>assert.throws(()=>assertAuthorityContinuity({generation:'g1',cursorBlock:100},{generation:'g1',cursorBlock:99}),/AUTHORITY_REGRESSION/));
