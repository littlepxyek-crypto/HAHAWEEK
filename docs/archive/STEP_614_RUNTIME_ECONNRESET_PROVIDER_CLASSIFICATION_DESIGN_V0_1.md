# STEP 614 — Runtime ECONNRESET Provider Classification Design v0.1

## Status

DESIGN — CONTRACT-GROUNDED

## Contract

`docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`

## Design Objective

Represent the observed `ECONNRESET` transport failure using the existing provider-unavailable operational boundary without changing frozen authority, evidence, cursor, checkpoint, writer-fence, or execution semantics.

## Change Boundary

### Production

File:

`src/core/operational-state.js`

Add one deterministic classification entry:

`ECONNRESET -> PROVIDER_UNAVAILABLE`

No other classification semantics change.

### Test

File:

`tests/operational-state.test.js`

Add a test equivalent to the existing `ECONNABORTED` regression, asserting:

- `failure_class === PROVIDER_UNAVAILABLE`;
- `operational_state === DEGRADED`;
- `recoverability === RETRYABLE`;
- `retry_policy === RETRY`;
- `isRetryableFailure(failure) === true`;
- `authority_impact === UNCHANGED`.

## State Model

The existing classifier already derives these fields from `PROVIDER_UNAVAILABLE`. The implementation therefore does not duplicate policy or create a second provider failure path.

## Failure Isolation

The change only affects classification of the provider transport error. It does not:

- mutate raw/canonical evidence;
- advance the cursor;
- change checkpoint state;
- establish authority;
- alter writer-fence ownership;
- alter retry timing;
- suppress the visible failure.

## Recovery Boundary

The operational state remains degraded and retryable. Existing runtime retry behavior remains authoritative. Recovery must still be verified by actual operator execution.

## Security / Regression

The test must demonstrate that the new code does not weaken unknown-failure fail-closed behavior. Existing tests for unknown failures and non-retryable authority/writer-fence failures remain unchanged.

## Acceptance

The design is accepted when the implementation is limited to the classification table and its deterministic regression test, repository test suites pass, Security/Regression passes, and post-merge runtime evidence is collected separately.
