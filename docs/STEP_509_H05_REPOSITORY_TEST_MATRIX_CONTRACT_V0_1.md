# STEP 509 — H-05 Repository Test Matrix Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Define the minimum repository-level executable test matrix required to demonstrate that Design Gate 2 controls remain independently testable and regression-safe. This contract does not activate V4 production authority and does not change existing evidence, cursor, checkpoint, RPC, or SQLite semantics.

## Required coverage

The matrix MUST provide executable coverage, directly or through existing authoritative tests, for:

1. canonicalization and deterministic hashing;
2. event identity and H-02 duplicate/collision semantics;
3. transition validation, predecessor continuity, fork/reorg isolation, duplicate/conflict classification, and recovery;
4. RPC acquisition provenance and validation boundaries where the corresponding implementation exists;
5. segment/manifest/checkpoint/cursor authority and recovery where the corresponding implementation exists;
6. writer lease/fence, stale authority rejection, and H-03 interaction;
7. H-04 durability ordering, crash/restart replay, and cursor/evidence ordering;
8. legacy migration controls and deterministic accounting where implemented;
9. backup/persistence integrity and malformed-state fail-closed behavior where applicable;
10. offline verification and golden-vector agreement.

## Matrix rules

- Every claimed control MUST map to at least one deterministic executable test or an explicitly documented unavailable/conditional boundary.
- Tests MUST distinguish positive behavior from fail-closed negative behavior.
- Existing tests are reused where they already provide authoritative coverage; no duplicate production implementation is introduced merely to satisfy the matrix.
- A test failure MUST fail the repository verification path rather than being silently ignored.
- The matrix MUST identify control, test location, execution command, expected invariant, and current disposition.
- Coverage claims MUST NOT imply production V4 activation.

## Control interaction requirements

The matrix MUST preserve:
- H-01 LEGACY_FROZEN as authoritative;
- H-02 same identity + same digest = IDEMPOTENT;
- H-02 same identity + different digest = INTEGRITY_CONFLICT;
- H-03 single-writer/fencing as authoritative;
- H-04 evidence persistence before cursor advancement;
- historical evidence preservation;
- no cursor reset or silent normalization.

## Safety boundary

This step MUST NOT:
- activate V4 production authority;
- modify RPC endpoints or acquisition semantics;
- alter cursor/checkpoint authority;
- introduce a SQLite schema migration;
- rewrite/delete historical evidence;
- introduce predictive/ranking/trading/signing/publication behavior;
- replace H-01, H-02, H-03, or H-04 semantics.

## Acceptance

The contract closes only when the matrix is implemented and executable evidence shows:
- all applicable Gate 2 controls are mapped;
- each mapped control has passing deterministic tests;
- conditional/unimplemented controls are explicitly dispositioned;
- the full repository test and security/regression paths remain green;
- historical state is preserved.

## Sequence

contract → matrix implementation → test-gap closure only where justified → full Tests → Security → CodeQL → merge → exact post-merge verification → state reconciliation.

Future semantic changes require a new reviewed contract/step.
