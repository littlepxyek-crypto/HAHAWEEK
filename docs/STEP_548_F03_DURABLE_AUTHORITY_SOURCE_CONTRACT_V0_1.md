# STEP 548 — F-03 Durable Authority Source Binding Contract v0.1

## Purpose

Close the next explicit F-03 Gate 2 gap after STEP 547: the expected authority commitment source must be bound to durable evidence/checkpoint state rather than remaining an injected in-memory expectation.

## Scope

Define a fail-closed durable-source boundary for expected F-03 authority commitments.

## Required behavior

1. The expected authority commitment MUST be resolved from durable persisted evidence/checkpoint state for the exact processed range.
2. The durable source MUST be distinct from the submitted live authority record.
3. The durable source MUST identify the exact range `fromBlock` and `toBlock`.
4. The durable source MUST contain complete F-03 commitment fields required by STEP 544/547:
   - `segmentId`
   - `manifestDigest`
   - `checkpointDigest`
   - `generation`
   - `cursorBlock`
5. The durable source MUST expose sufficient provenance to identify the persisted evidence/checkpoint record used for the commitment.
6. Missing durable evidence MUST fail closed before cursor advancement.
7. Missing checkpoint linkage MUST fail closed before cursor advancement.
8. A durable record for a different range MUST fail closed.
9. A malformed or incomplete durable record MUST fail closed.
10. The submitted authority record MUST NOT be written to or used to manufacture the expected durable commitment during validation.
11. Reading the durable source MUST be side-effect free with respect to cursor and evidence state.
12. The source read MUST be deterministic for identical persisted state and range.
13. Existing structural validation and STEP 544 cryptographic binding validation remain mandatory.
14. Existing checkpoint-before-cursor ordering remains mandatory.
15. No silent normalization, replacement, regeneration, cursor reset, historical rewrite, or evidence deletion is permitted.
16. No V4 production activation is introduced by this step.

## Acceptance evidence

- Contract merged to main.
- Implementation introduces a dedicated durable F-03 expected-authority source boundary.
- Direct tests prove valid persisted authority passes.
- Missing evidence fails closed.
- Missing checkpoint linkage fails closed.
- Wrong-range evidence fails closed.
- Malformed/incomplete durable evidence fails closed.
- Submitted authority cannot manufacture expected durable commitments.
- Durable-source read does not mutate cursor/evidence.
- Existing HAHAWEEK Tests and Security/Regression remain green.
- No V4 activation or historical mutation.

## Gate 2 disposition

STEP 548 addresses only the durable-source provenance portion of F-03. It MUST NOT mark Gate 2 PASS by itself.
