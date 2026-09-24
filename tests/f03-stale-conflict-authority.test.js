'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const {assertAuthorityContinuity}=require('../src/core/f03-production-authority-record');

const BASE={segmentId:'s1',manifestDigest:'m1',checkpointDigest:'c1'};

test('F-03 rejects conflicting authority generations',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:100},
    {...BASE,generation:'g2',cursorBlock:101}
  ),/AUTHORITY_GENERATION_CONFLICT/);
});

test('F-03 rejects authority cursor regression',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:101},
    {...BASE,generation:'g1',cursorBlock:100}
  ),/AUTHORITY_REGRESSION/);
});

test('F-03 accepts same-generation monotonic authority',()=>{
  assert.deepEqual(assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:100},
    {...BASE,generation:'g1',cursorBlock:101}
  ),{status:'CONTINUOUS',...BASE,generation:'g1',cursorBlock:101});
});

test('F-03 rejects same-generation segment binding conflict',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:100},
    {...BASE,segmentId:'s2',generation:'g1',cursorBlock:101}
  ),/AUTHORITY_SEGMENT_CONFLICT/);
});

test('F-03 rejects same-generation manifest binding conflict',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:100},
    {...BASE,manifestDigest:'m2',generation:'g1',cursorBlock:101}
  ),/AUTHORITY_MANIFEST_CONFLICT/);
});

test('F-03 rejects same-generation checkpoint binding conflict',()=>{
  assert.throws(()=>assertAuthorityContinuity(
    {...BASE,generation:'g1',cursorBlock:100},
    {...BASE,checkpointDigest:'c2',generation:'g1',cursorBlock:101}
  ),/AUTHORITY_CHECKPOINT_CONFLICT/);
});
});
