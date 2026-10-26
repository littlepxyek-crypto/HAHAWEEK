# STEP 608 — Operator Guide v0.1

This guide is generated only from repository-supported entry points.

## Status

Run:

`./bin/hahaweek status`

Observe:
- Node/npm availability;
- dependency presence;
- SQLite presence;
- Git HEAD/branch;
- clean/dirty repository state.

## Health

Run:

`./bin/hahaweek health`

Expected successful signals include:
- RPC URL;
- expected chain ID;
- actual chain ID;
- current block;
- `HEALTH: OK`.

A health failure is reported as `HEALTH: FAILED` and exits non-zero.

## Test

Run:

`./bin/hahaweek test`

This runs the repository test suite.

## One-Time Scan

Run:

`./bin/hahaweek scan`

This invokes the repository's one-time scan entry point.

## Continuous Start

Run:

`./bin/hahaweek start`

This starts the repository runner, which performs health followed by a scan cycle and retries failed cycles using its existing bounded backoff behavior.

SIGINT/SIGTERM are repository-supported stop signals.

## Repair

Run:

`./bin/hahaweek repair`

The repository-defined repair sequence:
1. verifies Node/npm;
2. installs/verifies dependencies;
3. checks selected source files;
4. runs the test suite;
5. checks RPC health;
6. prints final status.

Do not add manual database edits, cursor resets, evidence deletion, or undocumented recovery steps.

## STOP / FAIL-CLOSED

STOP when repository behavior reports an unrecoverable, ambiguous, conflicting, incomplete, or unverifiable state.

Do not:
- reset the cursor;
- rewrite historical evidence;
- delete evidence;
- invent fallback authority;
- create a second writer;
- bypass reconciliation;
- treat Surveillance output as authority.

## Recovery Verification

After a supported restart/recovery:
- run repository-supported status/health checks;
- confirm the repository's existing reconciliation/recovery tests remain green;
- verify that cursor/evidence semantics were preserved.

STEP 607 provides the integrated lifecycle/cursor crash-recovery evidence boundary. STEP 608 does not replace or weaken it.

## Scope

This guide does not activate V4 production authority.

V4 production authority remains INACTIVE / BLOCKED.

Surveillance remains derived, evidence-linked, versioned, and non-authoritative.

Unknown or undocumented behavior remains UNKNOWN / NOT ACCEPTED.
