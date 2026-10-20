# F-04 Legacy Migration Verification Checkpoint

Status: VERIFIED AT TEST BOUNDARY — DESIGN GATE 2 REMAINS OPEN

## Scope

This checkpoint records the current verification state for the F-04 legacy migration reference boundary. It does not authorize production V4 activation or migration of production evidence.

## Verified components

### F-04A — Legacy migration reference boundary

Verified by repository design artifact:

- deterministic legacy source inputs
- exact source-byte digest and byte length
- explicit source record count
- explicit dispositions: PRESERVE, MIGRATE, QUARANTINE, REJECT
- unknown/ambiguous provenance is not silently converted to MIGRATE
- migration identity is deterministic
- timestamps, runtime IDs, filesystem paths, and random values are excluded from migration identity
- source preservation and append-only audit semantics are required
- migration does not activate V4 authority

Reference vector:
- `docs/golden-vectors/f04a-legacy-source.json`

### F-04B — Legacy source verifier

Commit: `ac4bbb4be5caf39e16819eda6872fc8ed712ffb5`

GitHub Actions run: #567

Result: PASS

Verified behaviors include:

- valid F-04A source vectors
- exact source-byte length
- exact SHA-256 digest
- malformed source bytes fail closed
- tampered source fails
- incorrect byte length fails
- input immutability

### F-04C — Migration manifest

Initial verification run #571 failed because the test incorrectly expected the valid `MIGRATE` disposition to throw.

The test was corrected without changing the migration-manifest implementation.

Fix commit: `a198b98ca98ccf5b9edbafbf8f16188e0fe59113`

GitHub Actions run: #575

Result: PASS

Verified behaviors include:

- deterministic disposition digest
- deterministic migration identity
- all four valid disposition statuses are accepted
- invalid status is rejected
- disposition changes alter the identity
- manifest identity excludes timestamp/path fields
- unknown provenance cannot silently become migration

### F-04D — End-to-end reference migration boundary

Reference test introduced in commit:

`c52c9aa01b083e873e6ee614efead5889b51644f`

The initial run was blocked by the unrelated F-04C test defect.

The corrected branch was subsequently verified by GitHub Actions run #575.

Verified boundary:

source verifier → exact source digest/length → explicit disposition → migration manifest

Verified invariants:

- identical source and disposition reproduce the same manifest
- manifest binds to the exact source digest and byte length
- source-byte changes alter migration identity
- disposition changes alter migration identity
- source record count remains an explicit input

## Current verification result

F-04A: VERIFIED AT DESIGN/REFERENCE BOUNDARY

F-04B: VERIFIED AT TEST BOUNDARY

F-04C: VERIFIED AT TEST BOUNDARY

F-04D: VERIFIED AT TEST BOUNDARY

## Limitations

This checkpoint does not prove:

- production legacy migration execution
- migration of production evidence/state
- final V4 authority cutover
- final production storage durability
- complete migration of legacy cursor authority
- overall Design Gate 2 completion

No production evidence or state is modified by this checkpoint.

## Gate status

Design Gate 2 remains OPEN / NOT PASSED.

Production V4 activation remains NOT AUTHORIZED.

The next verification area is F-05 RPC acquisition provenance and completeness, followed by the remaining Design Gate 2 acceptance criteria.
