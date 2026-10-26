# STEP 608 — Design v0.1

## Design Goal

Additive operator-acceptance evidence over existing HAHAWEEK entry points, without changing production semantics, authority, cursor behavior, or evidence ownership.

## Frozen Boundary

The design must not modify:
- lifecycle schema or deterministic lifecycle identity;
- authority binding or expected-vs-production distinction;
- cursor semantics;
- writer-fence ownership;
- raw/canonical evidence authority;
- historical lineage;
- fail-closed recovery semantics;
- Surveillance authority boundary;
- V4 production authority state.

## Design

### 1. Operator CLI Evidence

Add tests around the existing `bin/hahaweek` interface to verify deterministic command dispatch for:
- status;
- health;
- test;
- scan;
- start;
- repair;
- help/invalid command behavior.

Tests must avoid mutating authoritative production evidence.

### 2. Health Evidence

Test `runHealth` using injected status/output functions so health success and health failure are deterministic and do not require a live RPC.

Required evidence:
- expected chain ID is reported;
- actual chain ID is reported;
- current block is reported;
- `HEALTH: OK` is emitted on success;
- health exceptions propagate to the caller.

### 3. Status Evidence

Use repository-supported status behavior as the source of truth. Where subprocess testing is used, it must run against an isolated temporary working context and must not rewrite authoritative state.

### 4. Failure / STOP Evidence

Operator acceptance must explicitly distinguish:
- successful health;
- failed health;
- failed scan/start cycle;
- FAIL-CLOSED/reconciliation failures.

No test may invent a new recovery action.

### 5. Repair Boundary

The existing `hahaweek repair` sequence is documented and smoke-tested only at its existing seams. The design does not add database editing, cursor manipulation, evidence deletion, or manual repair commands.

### 6. Recovery Preservation

Reuse existing STEP 607 recovery evidence and existing state/cursor tests rather than duplicating production recovery logic. Operator acceptance must demonstrate that supported restart/reconciliation preserves the existing cursor/evidence contract.

### 7. Documentation

Add operator-facing documentation that maps:
command -> purpose -> expected observable output -> failure signal -> supported next action -> STOP condition.

Every command/procedure must be traceable to repository code.

## Test Isolation

- No production data mutation.
- No cursor advancement for CLI acceptance tests unless an existing test explicitly owns that behavior.
- No network dependency for health unit tests.
- Temporary filesystem/process fixtures only where required.
- Preserve all existing tests and golden vectors.

## Acceptance Matrix

| Concern | Evidence |
|---|---|
| Setup/run | Existing package/bin entry points + smoke evidence |
| Health | Injected health success/failure tests |
| Status | CLI status smoke evidence |
| Failure recognition | Exit/output assertions |
| STOP/FAIL-CLOSED | Existing error/reconciliation semantics |
| Recovery | Existing STEP 607 evidence + operator mapping |
| Evidence preservation | State/cursor assertions where applicable |
| Reproducibility | Deterministic tests and repository documentation |

## Security / Regression

The design must verify:
- no shell injection through command dispatch;
- no accidental production-data writes from acceptance tests;
- no cursor reset;
- no historical rewrite;
- no evidence deletion;
- no fallback authority;
- no new writer/lock;
- no Surveillance authority;
- no V4 activation.

## Operator Acceptance

An operator should be able to follow only repository-documented procedures and determine:
1. how to check status;
2. how to check health;
3. how to run a scan/start;
4. how to recognize failure;
5. when repair/restart is supported;
6. how to verify recovery;
7. when to STOP/FAIL-CLOSED.

Unknown behavior must remain explicitly UNKNOWN / NOT ACCEPTED.

## Next Authorized Phase

After Design acceptance: STEP 608 Code.
