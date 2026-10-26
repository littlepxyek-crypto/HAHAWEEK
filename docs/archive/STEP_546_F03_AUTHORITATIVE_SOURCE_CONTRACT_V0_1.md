# STEP 546 — F-03 Authoritative Commitment Source Boundary Contract v0.1

## Purpose

Close the next explicit F-03 gap after STEP 545: the cryptographic binding is now enforced at the ingestion boundary, but the boundary still accepts an injected `expected` commitment record without proving that the expected commitments originate from a distinct authoritative source.

## Scope

Define and test a narrow authoritative-source boundary for the expected segment/manifest/checkpoint/generation/cursor commitments.

This step does not:
- activate V4 globally;
- change RPC/provider selection;
- reset or rewrite the cursor;
- rewrite or delete historical evidence;
- migrate SQLite;
- silently derive expected commitments from the submitted authority record.

## Required behavior

1. The F-03 authority gate MUST receive the submitted authority record and the expected authority commitments from distinct source outputs.
2. The expected commitment source MUST be explicit and callable for the exact processed range.
3. The gate MUST fail closed when the expected commitment source is missing, malformed, or does not return a complete authority commitment.
4. The submitted authority record MUST NOT be accepted as its own expected commitment source.
5. The expected commitment object MUST be independently materialized from the source result before cryptographic binding validation.
6. Structural authority validation MUST run before cryptographic binding validation.
7. Cryptographic binding validation MUST run before cursor advancement.
8. A source/range mismatch MUST fail closed.
9. Existing checkpoint-before-cursor ordering remains mandatory.
10. Existing fail-closed cursor, recovery, and regression semantics remain intact.
11. No silent normalization, replacement, or regeneration of expected commitments is permitted.
12. No V4 production activation is introduced by this contract.

## Acceptance evidence

- Contract merged to main.
- Direct adapter tests prove distinct submitted and expected source outputs are required.
- Missing expected source fails closed.
- Malformed/incomplete expected source fails closed.
- Same-object/self-derived expected authority fails closed.
- Exact range mismatch fails closed.
- Valid independently sourced commitments pass STEP 544 binding validation.
- Existing HAHAWEEK Tests and Security & Regression remain green.
- No production V4 activation, cursor reset, historical rewrite/deletion, RPC change, or SQLite migration.
