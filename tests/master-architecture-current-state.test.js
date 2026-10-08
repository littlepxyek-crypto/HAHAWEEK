'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const blueprint = fs.readFileSync(
  'docs/MASTER_ARCHITECTURE_BLUEPRINT_V1_0.md',
  'utf8'
);
const architectureDescription = fs.readFileSync(
  'docs/ARCHITECTURE_DESCRIPTION_V1_0.md',
  'utf8'
);
const projectState = fs.readFileSync('PROJECT_STATE.md', 'utf8');

test('PROJECT_STATE current snapshot is newer than the preserved historical snapshot', () => {
  const currentSection = projectState.split(/^## /m)[1] || '';
  assert.match(currentSection, /CURRENT MAIN RECONCILIATION SNAPSHOT — 2026-10-08/);
  assert.match(currentSection, /9305090bdec0c0195008a302bb15aa6bcb04de15/);
  assert.doesNotMatch(currentSection, /96b26068765da2736c9d9c397b2ad292a4e7425f/);
});

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


test('architecture description has a current-main reconciliation overlay', () => {
  assert.match(architectureDescription, /CURRENT-MAIN RECONCILIATION OVERLAY — 2026-10-08/);
  assert.match(architectureDescription, /Current main HEAD at reconciliation time: `9305090bdec0c0195008a302bb15aa6bcb04de15`/);
  assert.match(architectureDescription, /Reference Intelligence is implemented as a bounded, non-authoritative investigation boundary/);
  assert.match(architectureDescription, /V4 production authority remains INACTIVE/);
  assert.match(architectureDescription, /IMPLEMENTED` ≠ `VERIFIED` ≠ `AUTHORIZED` ≠ `ACTIVE`/);
});


test('master architecture explicitly separates integrity authority from external truth and keeps graph parallel to formation', () => {
  assert.match(blueprint, /V4 authority MUST NOT be described as an oracle of external truth/);
  assert.match(blueprint, /Graph MUST NOT be a prerequisite for Formation/);
  assert.match(blueprint, /historically verified/);
  assert.match(architectureDescription, /V4 is the integrity\/record authority.*not a truth oracle/);
  assert.match(architectureDescription, /Graph is not a prerequisite for Formation/);
});
