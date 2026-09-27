# STEP 614 — Partial Durable Processing Context Recovery Analysis v0.1

## Status
ANALYSIS — bounded under the existing STEP 614 Contract.

## Finding
The operator diagnostic for `64988747-64988756` shows an ACCEPTED/CANONICAL processing result and an intact canonical decision snapshot, but no canonical lineage and no production authority lifecycle. The stored CBDR is intact.

## Root cause
The current recovery path recognizes durable context only through `canonical_lineage`. With the lineage anchor missing, recovery returns null and the retry reconstructs CBDR input. A newer decision head then conflicts with the existing CBDR temporal commitment, correctly producing `CBDR_INTEGRITY_CONFLICT`.

## Required behavior
A missing lineage may be reconstructed only from an exact, internally verified processing result and snapshot, after current provider block identities are verified. Recovery must add only the missing lineage anchor and reuse the existing result/snapshot. It must never rewrite CBDR, evidence, cursor, authority, or history.

## Contract
No Contract Amendment is required. This is recovery-path completion within STEP 614. Frozen CBDR identity, evidence identity, cursor advancement, authority semantics, Surveillance, V4, and trading/signing/execution remain unchanged.

## Fail-closed conditions
Multiple exact results, invalid result/snapshot provenance, corrupted snapshot, provider identity mismatch, conflicting lineage, invalid parent/generation, or persistence failure must fail closed.
