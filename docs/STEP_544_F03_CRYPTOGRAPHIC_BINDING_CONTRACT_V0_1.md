# STEP 544 — F-03 Cryptographic Authority Binding Contract v0.1

## Purpose

Close the next narrow F-03 evidence gap identified by Design Gate 2: authority records must be cryptographically bound to the evidence commitments they claim to authorize.

## Scope

This step defines and tests the binding contract only. It does not activate V4 production authority, alter live RPC ingestion, rewrite historical evidence, reset the cursor, or migrate the SQLite schema.

## Required behavior

1. A production authority record must contain the segment identity, manifest digest, checkpoint digest, generation, and cursor boundary already defined by F-03.
2. The authority validator must reject malformed or incomplete binding material.
3. A supplied authority record must be accepted only when its manifest/checkpoint bindings match the expected evidence commitments for the same authority generation.
4. A mismatch between the authority record and expected manifest digest must fail closed.
5. A mismatch between the authority record and expected checkpoint digest must fail closed.
6. A segment identity mismatch must fail closed.
7. Generation mismatch must fail closed.
8. Cursor regression must remain fail closed.
9. Valid identical bindings must be deterministic and replay-safe.
10. Existing STEP 521–543 behavior must remain compatible unless the new contract explicitly tightens the F-03 boundary.
11. Tests must exercise the authority validation boundary directly and provide negative evidence for every binding mismatch.
12. No silent replacement or normalization of authority bindings is permitted.

## Acceptance evidence

- Complete authority with matching segment/manifest/checkpoint/generation/cursor is accepted.
- Missing binding material is rejected.
- Manifest mismatch is rejected.
- Checkpoint mismatch is rejected.
- Segment mismatch is rejected.
- Generation mismatch is rejected.
- Cursor regression is rejected.
- Identical valid authority validation is deterministic.
- Existing F-03 regression suite remains green.
- No V4 production activation is introduced by this step.
