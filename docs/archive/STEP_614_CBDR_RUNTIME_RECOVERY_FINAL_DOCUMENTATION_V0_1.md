# STEP 614 — CBDR Runtime Recovery Final Documentation v0.1

## Scope

F-614-06 addressed the runtime retry boundary where a durable verified processing context could be followed by an authority failure, leaving the cursor behind, and a later retry could reconstruct a new temporal CBDR with a different decision head.

The integrity layer correctly rejected that replay. The recovery defect was that the durable verified context was not inspected first.

## Contract

The existing STEP 614 Contract remains authoritative.

No new numbered STEP or Contract Amendment was introduced.

## Analysis

F-614-06 was analyzed under PR #578.

Root cause: durable exact-range processing context was not recovered before temporal CBDR construction.

## Design

PR #581 defined recovery-first behavior:

- inspect exact durable lineage;
- reconstruct and verify its canonical snapshot;
- verify current provider block identities;
- reuse only when identities match;
- otherwise preserve history and use the existing canonical/reorg path;
- fail closed on incomplete or contradictory durable state.

## Code

PR #582 implemented the recovery boundary in `src/core/runtime-processing-context.js`.

The implementation adds durable exact-range lookup and current identity verification before new CBDR construction.

## Tests

PR #582 added regression coverage for:

- restart/retry with a later provider head;
- provider identity change using the existing reorg path;
- conflicting exact durable lineages.

PR-head Tests and Security/Regression were SUCCESS. PR CodeQL was SUCCESS.

## Post-Merge / Reconciliation

- Implementation merge: `695df52cdebfe962aec23c5f0dd8983b2b4a73c4`
- Post-Merge Verification PR #583: merge `3b064b122751e03686022c2a1a6c9318000d0bbd`
- Reconciliation PR #584: merge `07adabbe81e555bc58129fc3647bc362f61124bf`

PROJECT_STATE.md now records the lifecycle through Documentation and preserves the historical sections below the current authority section.

## Actual runtime limitation

The recovery implementation has not yet been exercised in the real Termux environment after the implementation merge.

Therefore the original actual runtime evidence remains:

- cursor: `64986696`;
- last verified cursor: `64986696`;
- failure: `CBDR_INTEGRITY_CONFLICT`;
- evidence impact: `PRESERVE`;
- authority impact: `NO_ADVANCE`;
- recovery required: `true`;
- STOP: `FAIL-CLOSED`.

This is not a claim that the old failure still occurs after the fix; it is the last directly observed runtime state before the fix was installed.

## Operator verification required

The remaining gate must be exercised using repository-supported commands only.

The next runtime evidence must verify:

SETUP → START/SCAN → STATUS → HEALTH → failure diagnosis → recovery → recovery verification → STOP condition.

No database deletion, cursor reset, or history rewrite is part of recovery.

## Final state

Repository lifecycle for F-614-06 is documented and reconciled.

Global LIVE-READINESS remains **NOT READY / BLOCKED / FAIL-CLOSED** until actual operator recovery is observed and the remaining critical gate is satisfied.
