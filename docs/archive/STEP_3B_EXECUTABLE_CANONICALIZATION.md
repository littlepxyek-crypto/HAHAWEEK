# HAHAWEEK — STEP 3B Executable Canonicalization

Status: **STEP 3B-A — REFERENCE IMPLEMENTATION + FIRST ACTUAL VECTORS**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## Scope

This step introduces an isolated reference implementation for:

`canonical_bytes(O) = UTF8(RFC8785_JCS(O))`

and:

`hash(D,O) = SHA256(UTF8(D) || 0x00 || canonical_bytes(O))`

The implementation is under `src/reference/v4/` and does not import production ingestion, legacy raw storage, SQLite state, or production cursor code.

## Current fixture coverage

The first executable fixture is a minimal **PAYLOAD canonicalization** vector. Event-identity vectors remain a separate fixture family to be generated only after their exact input contract is finalized.

It contains one deterministic vector under:

`docs/golden-vectors/payload-event-identity.json`

These are protocol reference fixtures, not production evidence.

## Verification

Offline verification is provided by:

`scripts/verify-golden-vectors.js`

The test suite verifies:

- deterministic key ordering;
- compact canonical JSON;
- rejection of non-finite numbers;
- rejection of lone surrogate code units;
- domain separation;
- exact reproduction of stored canonical UTF-8 bytes;
- exact reproduction of stored SHA-256 hashes;
- mutation detection.

## Boundary

This PR does **not**:

- modify production ingestion;
- modify SQLite/runtime state;
- modify cursors;
- import production evidence;
- change migration behavior;
- declare Design Gate 2 passed.

The remaining V4 vector families and independent verifier/recovery controls remain open.
