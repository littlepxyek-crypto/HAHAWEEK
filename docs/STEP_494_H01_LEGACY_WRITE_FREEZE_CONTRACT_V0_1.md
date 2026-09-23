# STEP 494 — H-01 Legacy Write Freeze Contract v0.1

## Status

**CONTRACT — PENDING VERIFICATION**

## Purpose

Define the exact engineering boundary for H-01 — Legacy Write Freeze before any runtime implementation.

H-01 requires that legacy write paths become impossible after the explicit `LEGACY_FROZEN` state. This contract establishes the safety and evidence requirements without changing production behavior.

## Baseline

- Target baseline: current `main` after STEP 492.
- Design Gate 2 remains **NOT PASSED**.
- STEP 489–492 historical evidence remains preserved.
- This contract does not activate V4 production authority.

## Scope

The future H-01 implementation may enforce a write barrier around legacy persistence paths, but only after an explicit frozen-state input is established.

The implementation must identify and account for every legacy write path that can mutate authoritative or legacy project state, including:

- legacy event/database persistence;
- legacy state/cursor persistence;
- legacy migration-side writes where applicable;
- helper paths that can indirectly invoke legacy persistence.

No write path may bypass the freeze barrier through an alternate helper or direct storage call.

## State rule

`LEGACY_FROZEN` is an explicit, testable state.

Before `LEGACY_FROZEN`:

- existing legacy behavior remains unchanged;
- no implicit migration or authority change is introduced.

At `LEGACY_FROZEN` and after:

- every covered legacy write attempt MUST fail closed;
- no legacy record, state, cursor, database, or equivalent artifact may be newly mutated through a covered legacy path;
- failure MUST be observable and deterministic;
- the failed write MUST NOT partially mutate storage.

## Fail-closed behavior

A blocked legacy write must:

1. detect the frozen state before mutation;
2. reject the operation deterministically;
3. preserve pre-existing storage bytes/state;
4. expose an explicit machine-testable failure classification;
5. leave V4 authority untouched.

No fallback to a legacy writer is permitted after rejection.

## Required executable evidence

Positive evidence:

1. legacy write succeeds before `LEGACY_FROZEN`;
2. the same write path is rejected after `LEGACY_FROZEN`;
3. all enumerated legacy writers observe the same freeze rule;
4. freeze state survives restart/reinitialization where the state is intended to be persistent.

Negative evidence:

1. direct legacy writer bypass is rejected;
2. indirect/helper writer bypass is rejected;
3. partial write followed by rejection is rejected;
4. frozen-state mismatch or malformed freeze state fails closed;
5. a blocked legacy write cannot advance cursor/checkpoint authority;
6. a blocked legacy write cannot mutate V4 evidence.

## Integrity requirements

- No `INSERT OR IGNORE` or equivalent legacy conflict behavior may override H-01.
- H-01 must not redefine V4 identity, hashing, transition, manifest, checkpoint, or cursor semantics.
- Existing historical records remain immutable.
- No silent normalization is permitted.
- No cursor reset or authority promotion is permitted.

## Independence and safety

Contract verification must be deterministic and executable.

The contract does not authorize:

- production V4 cutover;
- RPC changes;
- SQLite schema migration;
- raw evidence mutation;
- cursor/checkpoint authority changes;
- deletion or rewriting of historical artifacts;
- prediction, ranking, trading, signing, or publication behavior.

## Acceptance criteria

H-01 contract is ready for implementation only when:

- all covered legacy write paths are enumerated;
- the freeze-state boundary is explicit;
- pre-freeze and post-freeze behavior is testable;
- bypass and partial-mutation cases are defined;
- authority isolation is explicitly preserved;
- implementation can be tested without changing unrelated V4 semantics.

## Required sequence

1. review this contract against current `main`;
2. implement the freeze barrier in isolation;
3. add positive and negative tests;
4. run Security & Regression and CodeQL;
5. freeze the verified boundary;
6. reconcile `PROJECT_STATE.md`;
7. only then evaluate the next unresolved Gate 2 control.

## Conclusion

STEP 494 defines H-01 only. It does not claim H-01 closure and does not alter production authority.
