# HAHAWEEK — EQC RESOURCE BOUNDARY V1

Status: IMPLEMENTED / VERIFIED
Contract: EQC-RESOURCE-1.0

## Purpose

Make EQC resource safety executable without changing the frozen authority architecture.

## Limits

- maximum result scan: 1000 rows;
- maximum page size: 100 rows;
- maximum page offset: 900;
- maximum traversal depth: 3;
- maximum block span: 100000 blocks;
- maximum synchronous query budget: 1000 ms.

Every bounded query is read-only and uses deterministic ordering.

Pagination state is query-navigation state only:

`EQC page offset != V4 ingestion cursor`.

Resource exhaustion fails closed with typed errors. It is never converted into negative evidence.

## Verification

Exact-head CI verification at `2b5628c7c9d28df2ef1507e97dc5e3748aab0c58`:
- HAHAWEEK Tests: SUCCESS (npm test, V4 verification, V4 coverage);
- HAHAWEEK Security and Regression: SUCCESS;
- HAHAWEEK A9 Runtime Verification: SUCCESS.

The EQC resource boundary is exercised by the repository test suite, including positive/negative resource-budget tests and bounded transaction/wallet query regression tests. No production V4 authority activation is performed by this contract.

## Acceptance

CONTRACT → IMPLEMENTATION → POSITIVE TEST → NEGATIVE TEST → RUNTIME VERIFICATION → DOCUMENTATION → RECONCILIATION.
