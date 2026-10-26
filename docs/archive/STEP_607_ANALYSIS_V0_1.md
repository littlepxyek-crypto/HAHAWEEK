# STEP 607 — Integrated Lifecycle/Cursor Crash-Recovery Evidence Analysis v0.1

## 1. Baseline

STEP 607 Contract is VERIFIED / RECONCILED / DOCUMENTED on main. The contract establishes the next evidence boundary: prove integrated lifecycle-database and cursor-state crash/restart behavior without changing frozen lifecycle schema, identity/binding, cursor semantics, writer-fence ownership, raw/canonical evidence, or Surveillance authority.

V4 production authority remains INACTIVE / BLOCKED.

## 2. Actual Repository Findings

### 2.1 Ingestion ordering

The current batch ingestion path in `src/core/ingestion.js` is:

`processorRange(fromBlock,toBlock)` → `authorityGate(authorityInput)` → `cursor.advance(toBlock)`.

Therefore the cursor is not advanced when processing or the synchronous authority gate rejects.

This is an ordering guarantee, not proof of cross-store crash atomicity.

### 2.2 Lifecycle durability

`src/core/production-authority-lifecycle.js` establishes a deterministic lifecycle identity from canonicalized establishment input and persists a `DURABLY_ESTABLISHED` lifecycle row through the existing database save boundary.

The commit path:
1. asserts writer ownership;
2. validates processing context and expected authority;
3. re-prepares and compares lifecycle identity, authority, predecessor and replacement type;
4. inserts the lifecycle row;
5. saves the database;
6. reads the durable record back;
7. validates the full lifecycle record;
8. restores the database snapshot on ordinary commit failure.

This proves a local lifecycle durability/readback boundary. It does not make the lifecycle database and cursor state file one atomic transaction.

### 2.3 Cursor durability

The existing cursor implementation persists through the state-file mechanism and retains regression protection. Cursor advancement occurs after authority validation in ingestion.

The lifecycle database and cursor state remain distinct durable stores.

### 2.4 Existing reconciliation

STEP 606 introduced deterministic lifecycle/cursor reconciliation. The current reconciliation:
- reads durable lifecycle records;
- rejects overlap and gaps;
- requires `cursorBlock === toBlock`;
- validates expected authority;
- validates production authority and binding;
- advances the cursor only after those checks;
- fails closed on cursor persistence failure;
- never resets the cursor;
- never deletes or rewrites lifecycle evidence.

This is deterministic recovery behavior, but it is not yet integrated crash evidence.

## 3. Failure-Atomicity Boundary

The repository currently proves the following normal ordering:

`Prepare → Final Authority Validation → Lifecycle Durable Commit → Cursor Durable Advance`.

The following remains NOT PROVEN by code inspection alone:

- process crash immediately after lifecycle database durability and before cursor durability;
- restart with lifecycle durable but cursor behind;
- physical durability ordering across the two stores under abrupt process termination;
- integrated crash during reorg/replacement;
- complete writer-fence/concurrency behavior across crash/restart;
- end-to-end evidence that recovery preserves both lifecycle lineage and cursor semantics after an actual interrupted boundary.

Therefore physical two-store atomicity must not be claimed.

## 4. Required Integrated Evidence Matrix

| Scenario | Current status | Required evidence |
|---|---|---|
| authority rejection before cursor | PROVEN synchronously | retain regression evidence |
| lifecycle preparation rejection | PROVEN by validation path | retain regression evidence |
| lifecycle durable + cursor durable | PROVEN on normal path | integrated test evidence |
| lifecycle durable + cursor failure | PARTIALLY IMPLEMENTED / NOT INTEGRATED | forced cursor persistence failure with durable lifecycle retained |
| crash after lifecycle durability | NOT PROVEN | deterministic crash injection/restart evidence |
| restart lifecycle ahead of cursor | PARTIALLY IMPLEMENTED | actual restart/reconciliation evidence |
| exact replay | PROVEN locally | integrated replay evidence |
| conflicting lifecycle identity | PROVEN by validation path | integrated evidence |
| range gap/overlap | PROVEN by reconciliation | integrated evidence |
| reorg predecessor | PROVEN at lifecycle boundary | crash/restart reorg evidence |
| writer-fence loss | PROVEN locally | integrated concurrency evidence |
| concurrent/repeated reconciliation | NOT FULLY PROVEN | deterministic concurrency/replay evidence |
| cursor regression | PROVEN locally | preserve existing regression evidence |

## 5. Recovery Semantics

The safe recovery boundary remains:

1. Preserve durable lifecycle evidence.
2. Read the durable lifecycle using exact processing identity/range.
3. Validate authority, binding, generation, lineage and expected authority.
4. Compare the durable lifecycle range with the persisted cursor.
5. Permit only the contractually valid forward completion.
6. If evidence is missing, ambiguous, conflicting or unverifiable: STOP / FAIL-CLOSED.
7. Never reset the cursor.
8. Never delete or rewrite historical lifecycle evidence.

No new operator command is inferred by this analysis.

## 6. Reorg / Replacement

The current lifecycle boundary records a predecessor for a reorg replacement and requires exactly one predecessor when the transition is marked `REORG_REPLACEMENT`.

What remains unproven is the behavior when a process terminates during the reorg lifecycle/cursor boundary and then restarts. The next design must demonstrate preservation of predecessor and replacement lineage without historical deletion or rewrite.

## 7. Concurrency / Writer Fence

The existing lifecycle implementation uses the repository's writer-fence ownership assertion. No second writer or lock is authorized.

The next design must test:
- ownership at preparation;
- ownership immediately before durable lifecycle write;
- ownership after readback;
- ownership loss before cursor advancement;
- repeated/replayed reconciliation;
- concurrent attempts to reconcile the same durable lifecycle.

No change to writer ownership semantics is authorized by this analysis.

## 8. Operator Acceptance

Repository evidence must eventually allow an operator to determine:
- whether lifecycle durability occurred;
- whether cursor durability occurred;
- whether the process stopped at an uncertain boundary;
- whether deterministic reconciliation succeeded;
- whether STOP / FAIL-CLOSED is required;
- whether recovery verification succeeded;
- that evidence and cursor were preserved.

No undocumented command/procedure may be introduced.

## 9. Surveillance Boundary

Surveillance remains unchanged:
- derived;
- evidence-linked;
- versioned;
- non-authoritative;
- no raw/canonical evidence mutation;
- no cursor advancement;
- no new authority;
- no automated action/trading;
- no unsupported ownership/actor inference;
- ADDRESS ≠ ACTOR;
- no temporal leakage.

This analysis does not authorize Surveillance implementation.

## 10. Design Boundary

The smallest safe Design boundary is an integrated crash/restart evidence harness around the existing lifecycle/cursor stores and reconciliation path.

Design must:
- use deterministic failure injection;
- preserve existing production semantics;
- distinguish lifecycle durability from cursor durability;
- exercise actual restart/reconciliation behavior;
- cover reorg and writer-fence boundaries;
- produce durable, auditable evidence;
- avoid cursor reset or historical evidence mutation;
- remain FAIL-CLOSED on ambiguity.

No V4 production activation is authorized by this analysis.

## 11. Conclusion

STEP 607 confirms that STEP 606 closed the deterministic reconciliation behavior but did not prove physical cross-store failure atomicity.

The remaining gap is evidence, not permission to invent a new persistence model.

V4 production authority therefore remains INACTIVE / BLOCKED until the integrated crash/restart/reorg/concurrency evidence boundary is actually proven and all subsequent acceptance gates are satisfied.

## 12. Next Authorized Phase

STEP 607 Design.
