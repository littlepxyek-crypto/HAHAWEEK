# STEP 614 — Actual Operator Runtime Final Evidence — 2026-09-29

Governing contract: `docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`.

Operator runtime repository HEAD: `ca74a19d80dde5ab6c24d85796a20fdc56cb9f09`.

## Direct runtime evidence

- Durable setup state existed and was readable.
- Initial durable cursor was `64992206`; last verified cursor was `64992186`; writer fence was released.
- A health attempt failed with provider timeout: `request timeout (code=TIMEOUT, version=6.17.0)`.
- A subsequent bounded scan succeeded with Chain ID `4663`, VERIFIED processing context, CONTINUATION, generation `1`, AUTHORIZED authority, and cursor `64992306`.
- Post-run durable state became HEALTHY with recovery VERIFIED and last verified cursor `64992306`.

## START and failure boundary

Actual `bash bin/hahaweek start` executed multiple successful cycles. A successful cycle reported Chain ID `4663`, HEALTHY state, VERIFIED processing, AUTHORIZED authority, and cursor outcome `64992806`.

The same actual run then reproduced `WRITER_FENCE_EXPIRED`. The runner reported:

- PRIMARY WRITE FAILED
- FALLBACK PERSISTED WRITER_FENCE_EXPIRED
- HAHAWEEK SCAN: FAILED
- RUNNER: state=BLOCKED
- failure is non-retryable; STOP / FAIL-CLOSED
- RUNNER: stopped

Post-failure durable state showed BLOCKED, failure class `WRITER_FENCE_FAILURE`, failure code `WRITER_FENCE_EXPIRED`, recoverability STOP, evidence impact PRESERVE, authority impact NO_ADVANCE, recovery required true, and last verified cursor `64992806`. The writer fence was released.

## Recovery

A bounded recovery scan from the last verified cursor `64992806` processed through `64993006`.

Runtime reported:

- Processing context: VERIFIED
- Transition: CONTINUATION
- Generation: 1
- Authority: AUTHORIZED
- Cursor outcome: 64993006

No cursor reset, evidence deletion, or authority substitution was performed.

## Recovery verification

Post-recovery status showed:

- Operational state: HEALTHY
- Cursor: 64993006
- Last verified cursor: 64993006
- Failure: NONE
- Recovery state: VERIFIED
- Recovery required: false
- STOP: no blocking operational state
- Writer fence owner: NONE
- Writer fence expiry: 0

## Reconciliation note

The observed `WRITER_FENCE_EXPIRED` remains a real runtime failure boundary. It is not treated as success. The evidence demonstrates bounded failure isolation, preservation, fail-closed STOP, and successful recovery from the durable last verified state.

This document records direct operator evidence and does not substitute CI or repository tests for runtime evidence.

Exact merge-head CI for `ca74a19d80dde5ab6c24d85796a20fdc56cb9f09` was not observed through the repository workflow lookup and is not claimed here.
