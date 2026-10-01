'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const runtimeSource = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'hfi-mvp-runtime-verify.js'),
  'utf8'
);

test('HFI runtime resolves cached block promises before reading timestamps', () => {
  assert.match(runtimeSource, /const tm=new Map\(\);for\(const n of nums\)\{const block=await B\(n\);/);
  assert.doesNotMatch(runtimeSource, /bc\.get\(n\)\.timestamp/);
});
