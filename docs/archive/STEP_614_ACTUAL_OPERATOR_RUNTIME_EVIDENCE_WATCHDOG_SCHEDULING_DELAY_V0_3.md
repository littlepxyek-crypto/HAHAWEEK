# STEP 614 — Actual Operator Runtime Evidence — Watchdog Scheduling Delay v0.3

## Contract

`docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`

This record documents a fresh actual operator-runtime screenshot supplied on 2026-09-28. The screenshot is preserved as the source artifact in the conversation; its SHA-256 is recorded below for deterministic provenance of the uploaded evidence.

## Raw evidence identity

- Uploaded evidence SHA-256: `d200292eeb405305d3cfdaf484a4cfd7de9a43ab75953c4268ce95306bb387cb`
- Evidence type: operator Termux terminal screenshot.
- Operator repository path shown at the prompt: `~/HAHAWEEK`.
- The screenshot does **not** display `git HEAD` or a commit SHA. Therefore this artifact does not by itself prove that the operator checkout was exactly the current `main` commit.

## Directly observed runtime evidence

The terminal shows:

### Initial health

- `Operational state: BLOCKED`
- `HEALTH: NOT READY (BLOCKED)`

### Runner start

- `=== HAHAWEEK START ===`
- `=== HAHAWEEK RUNNER ===`
- `Interval: 5000ms`
- `Max backoff: 60000ms`
- RPC: `https://rpc.mainnet.chain.robinhood.com`
- Expected Chain ID: `4663`
- Actual Chain ID: `4663`
- Initial current block: `74763470`
- Initial operational state: `BLOCKED`

### Processing

The displayed ranges were:

- `64989617-64989626`: fetched=27, inserted=0, duplicates=27
- `64989627-64989636`: fetched=37, inserted=37, duplicates=0
- `64989637-64989646`: fetched=16, inserted=16, duplicates=0
- `64989647-64989656`: fetched=52, inserted=52, duplicates=0
- `64989657-64989666`: fetched=27, inserted=27, duplicates=0
- `64989667-64989676`: fetched=50, inserted=50, duplicates=0
- `64989677-64989686`: fetched=68, inserted=68, duplicates=0
- `64989687-64989696`: fetched=47, inserted=47, duplicates=0
- `64989697-64989706`: fetched=40, inserted=40, duplicates=0
- `64989707-64989716`: fetched=30, inserted=30, duplicates=0

The first displayed range was a duplicate replay: all 27 fetched items were already present. The following nine displayed ranges inserted the fetched records without duplicates.

### Successful scan

The terminal then reported:

- Chain ID: `4663`
- Latest block: `74763501`
- Safe head: `74763498`
- Processed: `100`
- Cursor: `64989716`
- Processing context: `VERIFIED`
- Range: `64989707-64989716`
- Transition: `CONTINUATION`
- Generation: `1`
- Authority: `AUTHORIZED`
- Cursor outcome: `64989716`
- `RUNNER: cycle OK`

The displayed deterministic identifiers were preserved exactly as visible in the screenshot:

- Result ID: `pr:v1:3fbb0c94d8c2b6f40d6313742596100f8a0ce9552b374801ebf8453e9f446a`
- Execution ID: `px:v1:a465c5649945c3bd6543e791535bce35eff18e1810bca3e50ca73558642b42`
- Lineage ID: `cl:v1:408f434da649a7ae12fcbb09dc0edd89811f7e11f8be2c350e03438a1940b544`
- Evidence set digest: `d3e38d5605e0f78c9153c12a09f14b106c1a065f96b716ef3456b448dc84b4b`

### Subsequent health

The next cycle reported:

- Current block: `74764805`
- Expected Chain ID: `4663`
- Actual Chain ID: `4663`
- `Operational state: HEALTHY`
- `HEALTH: OK`

### Watchdog failure

The subsequent diagnostic record reported exactly:

- `leaseMs=30000`
- `intervalMs=7500`
- `startedAt=1790595250407`
- `readyAt=1790595250420`
- `renewalCount=2`
- `lastRenewScheduledAt=1790595265416`
- `lastRenewStartedAt=1790595301966`
- `lastRenewCompletedAt=1790595301968`
- `lastRenewDurationMs=2`
- `lastRenewedAt=1790595265532`
- `lastRenewFailureAt=1790595301968`
- `lastRenewFailureCode=WRITER_FENCE_EXPIRED`
- `lastRenewFailureDelayMs=36550`

The runtime then reported:

- `HAHAWEEK OPERATIONAL STATE: PRIMARY WRITE FAILED`
- `Writer-fence watchdog renewal failed: WRITER_FENCE_EXPIRED`
- `HAHAWEEK OPERATIONAL STATE: FALLBACK PERSISTED WRITER_FENCE_EXPIRED`
- `HAHAWEEK SCAN: FAILED`
- `Writer-fence watchdog renewal failed: WRITER_FENCE_EXPIRED`
- `RUNNER: cycle failed: COMMAND_FAILED: src/index.js exit=1 signal=none`
- `RUNNER: state=BLOCKED`
- `RUNNER: failure is non-retryable; STOP / FAIL-CLOSED`
- `RUNNER: stopped`

## Analysis

### Established by this evidence

1. The runtime successfully reached a `VERIFIED` processing context and `AUTHORIZED` authority outcome.
2. The cursor advanced to `64989716` only after the successful displayed processing range.
3. Duplicate replay was classified as duplicates rather than creating duplicate insertion.
4. A later health check reported `HEALTHY / HEALTH: OK`.
5. The watchdog became ready approximately 13 ms after its recorded start:
   `1790595250420 - 1790595250407 = 13 ms`.
6. The recorded delay between `lastRenewScheduledAt` and `lastRenewStartedAt` is exactly:
   `1790595301966 - 1790595265416 = 36550 ms`.
7. The writer-fence lease is 30000 ms, while the observed scheduling/start delay is 36550 ms. This is direct evidence that the failed renewal attempt started 6.55 seconds beyond the configured lease duration.
8. The runtime failed closed after the writer-fence expiry. No evidence in the screenshot indicates a cursor reset or historical deletion.

### Root-cause boundary

This evidence materially narrows the unresolved liveness problem.

The screenshot establishes a **renewal scheduling/start delay of 36.55 seconds**, exceeding the 30-second lease.

It does **not** establish why the renewal worker experienced that delay. Possible domains remain:

- scheduler/thread starvation or delayed worker execution;
- runtime/host suspension or throttling;
- process scheduling interruption;
- lock/filesystem interaction;
- other runtime timing behavior.

No one of these is promoted to the root cause without additional evidence.

### Temporal diagnostic anomaly

The screenshot also reports:

`lastRenewedAt=1790595265532`

while:

`lastRenewScheduledAt=1790595265416`
and:

`lastRenewStartedAt=1790595301966`.

The ordering is retained exactly as observed. This artifact does not normalize or reinterpret the timestamps. The value may represent the previous successful renewal rather than the failed attempt, but that interpretation requires source-level/runtime instrumentation evidence and is not asserted here.

## Integrity / authority assessment

- No cursor reset is authorized or evidenced.
- No historical evidence deletion is authorized or evidenced.
- The successful `VERIFIED/AUTHORIZED` processing result remains valid evidence for the displayed range unless later integrity evidence contradicts it.
- `WRITER_FENCE_EXPIRED` remains a blocking writer-fence condition.
- The operational fallback remains derived operational state and does not become evidence/cursor/authority.
- The screenshot alone does not establish current-main commit identity.

## Recovery boundary

The screenshot shows a successful cursor outcome of `64989716`, but it does not independently establish that this is the globally durable last-verified recovery boundary.

Recovery must therefore continue to use the repository-supported durable-state verification procedure. No cursor reset or manual cursor substitution is authorized from this screenshot alone.

## LIVE-READINESS assessment

This is stronger runtime evidence than the previous watchdog recurrence because:

- watchdog startup readiness was fast;
- a verified/authorized cycle completed;
- a subsequent healthy cycle completed;
- the failure now includes a measured 36.55-second renewal scheduling/start delay against a 30-second lease.

However, it still does **not** prove:

- current operator checkout == current `main` commit;
- sustained watchdog liveness;
- safe recovery from the durable last-verified state;
- restart continuity after recovery;
- complete live-readiness gate satisfaction.

Therefore:

**NOT READY / BLOCKED / FAIL-CLOSED**

`VERIFIED LIVE` remains unauthorized.

## Next authorized work

Continue STEP 614 under the existing Contract.

Required next evidence:

1. Verify operator checkout commit against current `main`.
2. Preserve the current durable cursor/evidence state.
3. Perform repository-supported durable-state inspection.
4. Execute recovery from the verified durable boundary without reset/deletion.
5. Verify recovery.
6. Restart and verify cursor/evidence continuity.
7. If the watchdog failure recurs, capture the complete diagnostic sequence and distinguish scheduling delay from lock/filesystem/host suspension causes.
8. Reconcile the resulting evidence into `PROJECT_STATE.md`.

No Contract Amendment is currently required.
