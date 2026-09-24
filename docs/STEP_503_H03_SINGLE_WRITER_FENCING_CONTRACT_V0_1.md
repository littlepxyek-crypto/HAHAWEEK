# HAHAWEEK — STEP 503 H-03 Single Writer / Fencing Contract v0.1

**Status:** CONTRACT — PENDING VERIFICATION

## 1. Purpose

Define the exact engineering boundary for H-03 — Single Writer / Fencing.

The objective is to prevent concurrent legacy writers from simultaneously mutating covered HAHAWEEK legacy state and to ensure that a stale writer cannot continue writing after ownership has moved to a newer writer.

H-03 is a concurrency and authority-control contract. It does not activate V4 production authority.

## 2. Required invariants

1. At most one active writer may hold write authority for the covered legacy write domain.
2. A writer must possess a valid current lease/fence before performing a covered write.
3. A stale, expired, superseded, malformed, or otherwise invalid writer authority must fail closed.
4. A newer writer/fence must invalidate an older writer deterministically.
5. A rejected stale writer must not partially mutate covered state.
6. Lease/fence state must not permit a writer to advance cursor/checkpoint authority after losing ownership.
7. Read-only operations remain available where currently supported.
8. H-01 `LEGACY_FROZEN` remains authoritative; fencing cannot bypass or weaken it.
9. H-02 identity/digest conflict semantics remain authoritative; fencing cannot convert a conflict into idempotence.
10. Existing historical evidence remains unchanged.

## 3. Scope

The implementation must identify every covered legacy write boundary that can be reached concurrently and place a common single-writer/fencing decision before mutation.

The implementation may introduce a dedicated lease/fence module and persistent state required to make ownership deterministic.

The implementation must not rely on process-local memory alone for authority that must survive independent processes.

## 4. Lease/fence semantics

The implementation must define, test, and document:

- writer identity;
- ownership acquisition;
- ownership renewal;
- ownership loss;
- expiry semantics;
- monotonically advancing fence/epoch value;
- stale-writer rejection;
- malformed lease-state failure;
- restart/reinitialization behavior;
- deterministic conflict handling when two writers contend.

A newer valid fence must supersede an older fence.

A writer that began with an older fence must not be able to complete a covered write after its authority has been superseded.

The exact persistence representation may be chosen during implementation, provided these invariants remain explicit and testable.

## 5. Positive acceptance cases

1. One writer acquires authority and performs an allowed write.
2. The same writer can renew authority according to the defined lease protocol.
3. A restarted writer can establish a valid new authority according to the protocol.
4. A newer writer obtains a higher fence/epoch and can write.
5. Read-only access remains available.
6. H-01 frozen state continues to reject writes regardless of valid fencing.
7. H-02 same-identity/same-digest remains idempotent when the writer is authorized.

## 6. Negative acceptance cases

1. Two writers cannot both hold current write authority.
2. A stale writer is rejected after a newer fence is established.
3. An expired writer is rejected.
4. A writer with malformed/unknown lease state fails closed.
5. A writer cannot bypass fencing through an alternate/helper write path.
6. A rejected write leaves covered persistent bytes/state unchanged.
7. A stale writer cannot advance cursor or checkpoint state.
8. A stale writer cannot mutate raw/canonical evidence.
9. A stale writer cannot use H-02 idempotence as a bypass.
10. H-01 `LEGACY_FROZEN` cannot be bypassed by acquiring a valid lease.
11. Restart/reinitialization cannot resurrect superseded writer authority.
12. Concurrent acquisition produces one deterministic winner and a rejected loser.

## 7. Concurrency test matrix

Executable tests must cover at minimum:

- two writers, same resource;
- writer A acquires, writer B supersedes;
- writer A attempts mutation after B fencing;
- lease expiry followed by reacquisition;
- renewal before expiry;
- renewal after supersession;
- restart with current lease;
- restart with expired lease;
- malformed lease state;
- stale fence replay;
- cursor mutation attempt by stale writer;
- checkpoint mutation attempt by stale writer;
- raw evidence mutation attempt by stale writer;
- deterministic repeated execution.

Tests must verify both returned classification/error and persistent-state nonmutation.

## 8. Recovery and crash boundary

The contract must distinguish:

- writer process crash;
- lease expiration;
- ownership reacquisition;
- interrupted mutation.

The implementation must not claim a write is committed merely because a lease was held.

The ordering between fencing, covered mutation, persistence, and cursor/checkpoint advancement must be explicit.

A crash must not allow an old writer to resume mutation merely because its process restarted.

## 9. Interaction with H-01 and H-02

H-03 is subordinate to existing controls:

`LEGACY_FROZEN` remains a hard write barrier.

H-02 remains the identity/digest integrity rule.

Neither control may be weakened to implement fencing.

## 10. Safety constraints

This step MUST NOT:

- activate V4 production authority;
- change RPC endpoints or acquisition semantics;
- reset or advance cursor authority as a semantic shortcut;
- change checkpoint authority;
- perform a SQLite schema migration;
- rewrite or delete historical evidence;
- silently normalize conflicting state;
- introduce predictive/ranking/trading/signing/publication behavior;
- merge stale historical implementation branches;
- replace H-01 or H-02 semantics.

## 11. Required implementation sequence

1. Contract review.
2. Lease/fence reference model.
3. Implementation.
4. Positive/negative concurrency tests.
5. Recovery/crash tests.
6. Full HAHAWEEK Tests.
7. Security & Regression.
8. CodeQL.
9. PR merge.
10. Exact merge-commit post-merge verification.
11. State reconciliation.
12. Only then evaluate the next control.

## 12. Closure condition

H-03 may be declared VERIFIED/FROZEN only when executable evidence demonstrates single-writer authority, deterministic fencing, stale-writer rejection, concurrency behavior, recovery behavior, nonmutation on rejection, and compatibility with H-01/H-02.

Until then:

**H-03 remains CONDITIONAL / NOT CLOSED.**

## 13. Independence and preservation

This contract preserves all historical project-state entries.

No existing evidence is migrated, rewritten, deleted, or reinterpreted by the contract itself.

Any future semantic change to H-03 requires a new explicit contract/step.
