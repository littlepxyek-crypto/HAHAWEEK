# STEP 614 — Runtime ECONNRESET Provider Classification Analysis v0.1

## Status

ANALYSIS — CONTRACT-GROUNDED

## Contract

`docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`

## Observation

Actual operator runtime on exact current main `22a4bf88d22e49beb1062d045126e09c5e83b7f4` produced:

- `./bin/hahaweek status`: Git HEAD `22a4bf8`, branch `main`, operational state `HEALTHY`, cursor `64991596`.
- `./bin/hahaweek health`: expected chain ID `4663`, actual chain ID `4663`, RPC health `OK`.
- `./bin/hahaweek scan`: provider initialization failed with `JsonRpcProvider failed to detect network and cannot start up` followed by `read ECONNRESET`.
- Writer-fence watchdog diagnostics were present with `leaseMs=30000`, `intervalMs=3750`, `renewalCount=8`, and `lastRenewFailureCode=null`.

The observed transport failure is therefore distinct from the previously reproduced writer-fence liveness failure.

## Detection

The existing operational failure classifier explicitly maps provider transport failures such as `TIMEOUT`, `NETWORK_ERROR`, and `ECONNABORTED` to the existing `PROVIDER_UNAVAILABLE` class. It does not map `ECONNRESET`.

Because `classifyFailure` uses the exact error code as its lookup key, `ECONNRESET` currently falls through to `UNKNOWN_FAILURE`.

## Contract Boundary

Mapping `ECONNRESET` to the already-defined `PROVIDER_UNAVAILABLE` class does not change authority, evidence, cursor, checkpoint, writer-fence ownership, or recovery semantics. It makes a known transport failure conform to the existing provider-unavailable failure boundary.

The change remains within the authorized STEP 614 Contract because:

1. provider failures are explicitly in scope;
2. unavailable provider state must remain distinct from evidence absence;
3. provider failure must be isolated and visible;
4. retryable provider-unavailable failures preserve authority and evidence;
5. no new authority or progress semantics are introduced.

No Contract Amendment is required.

## Root Cause

Root cause of the observed runtime failure at the network boundary is not established by this evidence and remains external/provider-transport level. The repository defect established by the evidence is narrower and deterministic:

`ECONNRESET` is an observed provider transport failure that is not represented by the existing provider-unavailable classifier.

## Impact

Before remediation, an `ECONNRESET` can be classified as `UNKNOWN_FAILURE`, causing the fail-closed STOP path rather than the existing retryable provider-unavailable path.

This does not justify treating the RPC failure as successful, empty, or negative evidence.

## Required Remediation

Add deterministic classification coverage for `ECONNRESET`:

- failure class: `PROVIDER_UNAVAILABLE`;
- operational state: `DEGRADED`;
- recoverability: `RETRYABLE`;
- retry policy: `RETRY`;
- authority impact: `UNCHANGED`;
- evidence impact: `PRESERVE`.

Add a regression test proving the mapping.

## Forbidden Changes

- no cursor reset;
- no evidence deletion or rewrite;
- no authority expansion;
- no fallback authority;
- no writer-fence semantic change;
- no RPC result fabrication;
- no conversion of provider failure into negative evidence;
- no trading/signing/execution behavior.

## Acceptance Criteria

1. `ECONNRESET` is deterministically classified as `PROVIDER_UNAVAILABLE`.
2. The resulting operational state is `DEGRADED` and retryable.
3. Authority remains unchanged and evidence is preserved.
4. Existing unknown-failure fail-closed behavior remains unchanged.
5. Repository tests and Security/Regression CI pass.
6. Post-merge operator runtime still must be verified on the resulting main; this change alone cannot establish VERIFIED LIVE.
