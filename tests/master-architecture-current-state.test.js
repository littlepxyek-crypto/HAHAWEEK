'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const blueprint = fs.readFileSync(
  'docs/MASTER_ARCHITECTURE_BLUEPRINT_V1_0.md',
  'utf8'
);

test('master architecture current-state section does not regress to historical MVP-only status', () => {
  const current = blueprint.slice(
    blueprint.indexOf('# 23. Current Repository Reality'),
    blueprint.indexOf('# 24. Acceptance Tests for the Master Architecture')
  );

  assert.doesNotMatch(current, /MVP remains DESIGN-ONLY/);
  assert.match(current, /verified bounded vertical slice/);
  assert.match(current, /Reference Intelligence is implemented behind a bounded gateway/);
  assert.match(current, /V4 production authority remains INACTIVE/);
});

test('historical R-01..R-14 findings are not presented as uniformly open current blockers', () => {
  const closure = blueprint.slice(
    blueprint.indexOf('# 22. Current Contract Closure Position'),
    blueprint.indexOf('# 23. Current Repository Reality')
  );

  assert.match(closure, /R-01\.\.R-14 are now represented by explicit current-main contracts/);
  assert.doesNotMatch(closure, /^R-01\.\.R-14 are now represented.*OPEN$/m);
});


test('master architecture contains no stale current-state gate wording outside historical audit references', () => {
  assert.doesNotMatch(blueprint, /The Cross-Spec Reconciliation Audit remains the governing blocker for implementation freeze while R-01\.\.R-14 remain open\./);
  assert.doesNotMatch(blueprint, /MVP remains DESIGN-ONLY\./);
  assert.doesNotMatch(blueprint, /R-01 through R-14 remain open until reconciled and covered by executable vectors\./);
});
