'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  validateLifecycleState,
  ERRORS,
  PHASES,
} = require('../src/core/lifecycle-state-authority');

const ROOT = path.resolve(__dirname, '..');

test('current PROJECT_STATE is valid and exposes STEP 613 Verification authority', () => {
  const source = fs.readFileSync(path.join(ROOT, 'PROJECT_STATE.md'), 'utf8');
  const result = validateLifecycleState(source);

  assert.equal(result.valid, true);
  assert.equal(result.current_step, 613);
  assert.equal(result.phase, 'VERIFICATION');
  assert.ok(PHASES.includes(result.phase));
  assert.match(result.contract, /CONTRACT_FAILURE_ISOLATED_RESILIENCE_OPERATOR_ARCHITECTURE/);
  assert.equal(result.next_step, 'Reconciliation is authorized by verified Post-Merge Verification');
});

test('stale historical next-step text cannot override current state', () => {
  const source = [
    '## STEP 611 — Lifecycle State Authority & Next-Step Boundary — CODE — IN PROGRESS',
    '',
    '- Contract: docs/STEP_611_LIFECYCLE_STATE_AUTHORITY_NEXT_STEP_BOUNDARY_CONTRACT_V0_1.md.',
    '- **Next authorized phase: STEP 611 Test.**',
    '',
    '## STEP 610 — Historical Artifact — VERIFIED / RECONCILED / DOCUMENTED',
    '',
    '- **Next STEP: STEP 610 Analysis.**',
  ].join('\n');

  const result = validateLifecycleState(source);

  assert.equal(result.valid, true);
  assert.equal(result.next_step, 'STEP 611 Test');
});

test('missing contract fails closed', () => {
  const result = validateLifecycleState([
    '## STEP 611 — Lifecycle State Authority & Next-Step Boundary — CODE — IN PROGRESS',
    '',
    '- **Next authorized phase: STEP 611 Test.**',
  ].join('\n'));

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [ERRORS.CONTRACT_MISSING]);
});

test('conflicting current next-step declarations fail closed', () => {
  const result = validateLifecycleState([
    '## STEP 611 — Lifecycle State Authority & Next-Step Boundary — CODE — IN PROGRESS',
    '',
    '- Contract: docs/STEP_611_LIFECYCLE_STATE_AUTHORITY_NEXT_STEP_BOUNDARY_CONTRACT_V0_1.md.',
    '- **Next authorized phase: STEP 611 Test.**',
    '- **Next STEP: Analysis for STEP 612 is authorized by the merged Contract.**',
  ].join('\n'));

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [ERRORS.NEXT_STEP_CONFLICT]);
});

test('missing next step fails closed', () => {
  const result = validateLifecycleState([
    '## STEP 611 — Lifecycle State Authority & Next-Step Boundary — CODE — IN PROGRESS',
    '',
    '- Contract: docs/STEP_611_LIFECYCLE_STATE_AUTHORITY_NEXT_STEP_BOUNDARY_CONTRACT_V0_1.md.',
  ].join('\n'));

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [ERRORS.NEXT_STEP_MISSING]);
});

test('malformed current state fails closed', () => {
  const result = validateLifecycleState('## STEP 611 — malformed');

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [ERRORS.MALFORMED]);
});

test('validator does not mutate input', () => {
  const source = [
    '## STEP 611 — Lifecycle State Authority & Next-Step Boundary — CODE — IN PROGRESS',
    '',
    '- Contract: docs/STEP_611_LIFECYCLE_STATE_AUTHORITY_NEXT_STEP_BOUNDARY_CONTRACT_V0_1.md.',
    '- **Next authorized phase: STEP 611 Test.**',
  ].join('\n');
  const before = source;

  validateLifecycleState(source);

  assert.equal(source, before);
});

test('error ordering is deterministic', () => {
  const a = validateLifecycleState('');
  const b = validateLifecycleState('');

  assert.deepEqual(a.errors, b.errors);
  assert.deepEqual(a.errors, [ERRORS.MALFORMED]);
});