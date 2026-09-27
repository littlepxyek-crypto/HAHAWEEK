# STEP 614 — ECONNABORTED Runtime Failure Design

## Objective

Classify the known `ECONNABORTED` RPC transport failure using the existing provider-unavailable failure domain.

## Design

Add one classification entry:

`ECONNABORTED → PROVIDER_UNAVAILABLE`

The existing operational-state machinery then produces:

- operational state: DEGRADED;
- recoverability: RETRYABLE;
- retry policy: RETRY;
- authority impact: UNCHANGED;
- evidence impact: PRESERVE.

No new state, retry mechanism, cursor mechanism, or authority mechanism is introduced.

## Regression

Add a deterministic unit test proving that an `ECONNABORTED` failure:

1. classifies as `PROVIDER_UNAVAILABLE`;
2. becomes `DEGRADED`;
3. remains `RETRYABLE`;
4. is accepted by `isRetryableFailure`;
5. does not claim authority impact.

Existing unknown-failure and authority-mismatch tests remain unchanged.

## Operator implication

An external RPC transport abort may now enter the existing runner retry path instead of being misclassified as an unknown runtime failure. The authoritative cursor/evidence boundaries remain unchanged.

## Non-goals

No change to:

- writer-fence lease semantics;
- cursor semantics;
- evidence semantics;
- authority semantics;
- V4 activation;
- Surveillance;
- trading/signing/execution.
