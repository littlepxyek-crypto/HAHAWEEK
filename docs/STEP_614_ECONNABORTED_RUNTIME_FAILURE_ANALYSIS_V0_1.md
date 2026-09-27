# STEP 614 — ECONNABORTED Runtime Failure Analysis

## Evidence

Fresh Termux runtime on merged PR #594 commit `ac4daac4853285bce174a7c5be7f99a3f9f4b9fa` processed four successful ingestion ranges:

- 64987387–64987396
- 64987397–64987406
- 64987407–64987416
- 64987417–64987426

Each reported fetched/inserted records with duplicates=0.

The subsequent runtime failure was:

`ECONNABORTED`

The operator state reported:

- Operational state: UNKNOWN
- Failure class: UNKNOWN_FAILURE
- Failure boundary: RUNTIME
- Recoverability: STOP
- Evidence impact: PRESERVE
- Authority impact: NO_ADVANCE
- Recovery required: true
- STOP: FAIL-CLOSED

Health separately reported a request timeout.

## Classification finding

The existing operational-state classifier already maps RPC/network timeout conditions such as `TIMEOUT`, `RPC_TIMEOUT`, and `NETWORK_ERROR` to `PROVIDER_UNAVAILABLE`, which is retryable and isolated from authoritative state.

`ECONNABORTED` was not included in that existing network/provider classification map. Consequently, an aborted external RPC connection was classified as `UNKNOWN_FAILURE`, causing the runner to stop instead of entering the existing retryable provider-unavailable path.

## Boundary check

The failure originates from the external RPC transport and does not establish negative evidence, authority, or cursor validity.

Mapping this known transport failure into the existing `PROVIDER_UNAVAILABLE` class does not create a new authority model. It aligns the error with the already frozen provider-failure isolation and retry behavior.

## Impact

Without the mapping:

`RPC transport abort → UNKNOWN → STOP`

With the bounded fix:

`RPC transport abort → PROVIDER_UNAVAILABLE → DEGRADED → existing retry policy`

Existing fail-closed behavior remains applicable for unknown or integrity/authority failures.

## Contract conclusion

No Contract Amendment is required. The change remains within the existing failure-isolation and provider-unavailable semantics.

## Constraints preserved

- no cursor reset;
- no unauthorized cursor advance;
- no evidence deletion or rewrite;
- no fallback authority;
- no V4 authority activation;
- no Surveillance authority;
- no trading/signing/execution;
- unknown failures still fail closed.
