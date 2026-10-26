# STEP 558 — Design Gate 2 Remaining Acceptance Analysis & Design Finding v0.1

Status: ANALYSIS / DESIGN
Step: 558
Contract: STEP 558 Design Gate 2 Remaining Acceptance Evidence Contract

## Repository finding

The current `main` state already contains executable evidence for:

- V4 reference canonicalization and domain-separated hashing;
- golden-vector reproduction and mutation detection;
- independent golden-vector verification;
- independent checkpoint/cursor recovery verification;
- F-01 through F-05 and H-01 through H-05 frozen states;
- F-03 durable expected-authority persistence;
- production ingestion authority validation and binding.

The remaining evidence gap is not protocol implementation. It is the final gate-wide traceability at the actual production wiring boundary.

## Design decision

Add a narrow executable Gate-2 evidence test that proves the production engine's default expected-authority source is the durable F-03 reader and cannot fall back to submitted authority.

The test MUST:

1. create a real production database boundary;
2. persist a valid F-03 segment -> manifest -> checkpoint chain;
3. construct the production expected-authority source from current main wiring;
4. read an exact range and assert cursorBlock equals persisted segment.to_block;
5. demonstrate absence of durable authority fails closed;
6. inspect the independent verifier boundary for absence of production-reference imports;
7. leave all runtime state isolated to test fixtures.

## Non-findings

No new production protocol semantics are required.

No V4 global activation is required or authorized.

No cursor reset, migration, RPC change, historical rewrite, or frozen-contract modification is required.

## Gate interpretation

If the new evidence passes, Gate 2 conditions 3, 4, and 5 have direct current-main evidence.

Gate 2 still requires preservation of historical evidence and all F/H control closure. The aggregate gate must remain NOT PASSED until every acceptance condition is verified.

## Fail-closed

Any mismatch, fallback, missing durable chain, or production-reference dependency causes the test to fail.
