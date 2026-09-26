# STEP 613 — Failure-Isolated Resilience & Operator Architecture — Design v0.1

## Design Authority
Contract: `docs/CONTRACT_FAILURE_ISOLATED_RESILIENCE_OPERATOR_ARCHITECTURE_V0_1.md`.
Analysis: `docs/STEP_613_ANALYSIS_V0_1.md`.
The design introduces no production implementation.

## 1. Operational State Model

Persisted operational state is derived runtime state, not evidence authority.

Allowed operational states:
- INITIALIZING
- HEALTHY
- DEGRADED
- PARTIAL
- RECOVERING
- BLOCKED
- FAILED
- UNKNOWN

Operational state does not replace authoritative evidence, checkpoint, cursor, canonical lineage, or authority lifecycle.

### State meanings
- HEALTHY: latest completed cycle verified and no unresolved operational failure.
- DEGRADED: authoritative state remains valid, but a non-authoritative/provider capability is unavailable or transiently failing.
- PARTIAL: cycle completed with explicitly bounded partial coverage that is contractually distinguishable from empty/negative evidence.
- RECOVERING: recovery is in progress from a known durable verified state.
- BLOCKED: execution is intentionally prevented because integrity, authority, cursor, checkpoint, writer-fence, or recovery verification is not trustworthy.
- FAILED: a cycle failed and the durable state remains known; no false health claim.
- UNKNOWN: operational state itself cannot be trusted; STOP/FAIL-CLOSED.

## 2. Failure Classification

Structured failure record fields:
- failure_class
- failure_code
- boundary
- recoverability
- retry_policy
- observed_at
- last_verified_cursor
- evidence_impact
- authority_impact
- recovery_required

Classes:
- PROVIDER_UNAVAILABLE
- PROVIDER_INVALID
- EVIDENCE_UNAVAILABLE
- EVIDENCE_INVALID
- EVIDENCE_CONFLICT
- CANONICALITY_AMBIGUOUS
- AUTHORITY_MISMATCH
- CHECKPOINT_MISMATCH
- CURSOR_PERSISTENCE_FAILURE
- WRITER_FENCE_FAILURE
- RECOVERY_FAILURE
- OPERATIONAL_STATE_CORRUPT
- UNKNOWN_FAILURE

The classification is descriptive and must not convert unavailable/unknown/conflict into negative evidence.

## 3. Retry / Stop Policy

Retryable:
- PROVIDER_UNAVAILABLE
- transient acquisition failure where durable state remains valid

Non-retryable / STOP or BLOCK:
- PROVIDER_INVALID
- EVIDENCE_INVALID
- EVIDENCE_CONFLICT
- CANONICALITY_AMBIGUOUS
- AUTHORITY_MISMATCH
- CHECKPOINT_MISMATCH
- CURSOR_PERSISTENCE_FAILURE
- WRITER_FENCE_FAILURE
- RECOVERY_FAILURE
- OPERATIONAL_STATE_CORRUPT

UNKNOWN failures fail closed unless classified safely.

Runner may retry only retryable failures. It must not turn a blocked/fatal state into HEALTHY by retrying indefinitely.

## 4. Durable Operational State

Extend the existing state record additively with:
- operationalState
- failure
- recovery
- lastVerifiedCursor

Existing `lastProcessedBlock` remains the cursor field and retains existing semantics.

Failure recording must be atomic and must never overwrite raw/canonical evidence.

If failure-state persistence itself fails, the original failure remains the primary error and the process exits fail-closed; no synthetic HEALTHY/IDLE state may be written.

## 5. Recovery State Machine

`LAST VERIFIED STATE → VERIFY DURABLE STATE → RECOVERING → EXECUTE SUPPORTED RECOVERY → VERIFY AUTHORITY/CURSOR → HEALTHY`

Failure at any verification boundary:
`RECOVERING → BLOCKED`

Recovery must reuse:
- existing production authority lifecycle reconciliation;
- canonical lineage/reorg validation;
- writer fence;
- cursor persistence;
- existing restart tests.

No recovery path may reset the cursor or delete/rewrite evidence.

## 6. Health / Status Projection

Operator-facing status is a projection only.

It must expose, where available:
- operationalState
- current/last verified cursor
- failure class/code/boundary
- recoverability
- retry policy
- recovery state
- evidence impact
- authority impact
- STOP condition

`HEALTH: OK` is allowed only for HEALTHY state with successful RPC identity/reachability and no unresolved blocking failure.

Provider failure must produce a non-OK state, not an empty/negative evidence result.

## 7. Observer / Derived Isolation

Derived and observer failures:
- may set DEGRADED/PARTIAL;
- cannot mutate authoritative evidence;
- cannot advance cursor;
- cannot alter checkpoint/manifest authority;
- cannot erase uncertainty/conflict;
- cannot become canonical provider authority.

## 8. Concurrency

All state/evidence mutations continue through the existing single-writer fence.
No second writer, lock bypass, or concurrent cursor mutation is introduced.

## 9. Reorg / Temporal Integrity

Operational failure state must not alter canonical lineage semantics.
Reorg replacement remains versioned historical lineage.
Prior evidence remains accessible.
No future evidence may be used to retroactively declare an earlier operational state healthy.

## 10. Test Vectors

Required tests:
1. provider unavailable preserves cursor/evidence and yields DEGRADED/FAILED according to boundary.
2. provider invalid response fails closed.
3. authority mismatch yields BLOCKED without cursor advance.
4. checkpoint mismatch yields BLOCKED without cursor advance.
5. cursor persistence failure preserves prior cursor.
6. writer-fence failure is visible and non-retryable.
7. malformed operational state yields UNKNOWN/STOP.
8. recovery transitions RECOVERING → HEALTHY only after authority/cursor verification.
9. failed recovery transitions to BLOCKED without reset.
10. runner retries provider-unavailable but does not retry blocked authority failures indefinitely.
11. health does not report OK when a blocking failure exists.
12. observer/derived failure cannot mutate authoritative evidence/cursor.
13. existing restart/reorg/concurrency regressions remain green.
14. historical state remains preserved.

## 11. Operator Procedure

Repository-supported interfaces remain:
`./bin/hahaweek status`
`./bin/hahaweek health`
`./bin/hahaweek test`
`./bin/hahaweek scan`
`./bin/hahaweek start`
`./bin/hahaweek repair`

The implementation may improve their output, but must not invent a new command unless the Contract is amended.

Operator decision boundary:
- HEALTHY → normal operation.
- DEGRADED/PARTIAL → inspect status/coverage; authoritative evidence remains valid only within explicit boundary.
- RECOVERING → do not start a second writer.
- BLOCKED/FAILED/UNKNOWN → STOP/FAIL-CLOSED and use supported repair/recovery only.
- Never reset cursor/history to make status healthy.

## 12. Explicit Non-Changes
- No raw/canonical schema rewrite.
- No cursor semantics change.
- No V4 authority activation.
- No STEP 612 semantic change.
- No trading/signing/execution.
- No actor inference/deanonymization.
- No predictive scoring/ranking/risk authority.
