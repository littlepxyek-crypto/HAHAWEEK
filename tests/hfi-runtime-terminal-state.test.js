'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const c=fs.readFileSync('scripts/hfi-mvp-runtime-verify.js','utf8');
test('no verified formation ends runtime artifact in FAILED state',()=>{assert.match(c,/base\.state='FAILED';base\.failure=\{code:'NO_VERIFIED_HFI_FORMATION'/);});
test('HFI discovery leaves enough elapsed history for seven-day outcome',()=>{assert.match(c,/DISCOVERY_AGE_DAYS=10/);assert.match(c,/DISCOVERY_LOOKBACK_DAYS=30/);});
test('formation reconstruction scans beyond the initialization transaction window',()=>{assert.match(c,/il\.blockNumber\+10000/);});
