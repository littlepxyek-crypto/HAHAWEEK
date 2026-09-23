# STEP 489 — F-02 Reorg / Transition Closure Contract v0.1

Status: **CONTRACT — PENDING VERIFICATION**

## Purpose

Define only the missing executable boundary identified by STEP 488 for Design Gate 2 F-02. This contract does not activate V4 production authority and does not alter existing transition semantics.

## Closure target

The contract covers deterministic, offline validation of a supplied historical transition/reorg scenario, including:

1. canonical/orphan coexistence as preserved records;
2. competing history isolation;
3. predecessor-chain continuity across a reorg sequence;
4. interruption/recovery from a persisted prefix;
5. deterministic replay without mutation of historical records;
6. duplicate/collision classification across competing histories;
7. explicit linkage between transition evidence identity and supplied block/evidence provenance metadata.

## Normative boundary

The existing five-field V4 transition object and its frozen state edges remain authoritative:

- OBSERVED -> CANONICAL
- CANONICAL -> ORPHANED

No new state, field, hash encoding, sequence encoding, or transition edge is introduced by this step.

The reorg scenario is an offline supplied fixture. It is not a live RPC or production-ingestion test.

## Required scenario model

A fixture MUST represent:

- an evidence subject;
- its ordered transition records;
- transition hashes;
- a canonical history prefix;
- an orphaned branch/history;
- a competing canonical candidate where applicable;
- block/evidence provenance references sufficient to identify the affected evidence;
- a recovery interruption point;
- the expected authoritative contiguous prefix after recovery;
- expected preserved historical records.

The fixture MUST retain both canonical and orphaned evidence records. Orphaning MUST NOT delete or rewrite the historical record.

## Deterministic fork isolation

A competing history MUST NOT be silently merged into the authoritative chain.

A candidate transition that does not reference the immediately preceding authoritative transition hash MUST fail closed as a fork/predecessor conflict.

Two distinct transition histories MAY coexist as supplied historical evidence, but only the explicitly linked contiguous history may be returned as authoritative for the tested scenario.

## Recovery semantics

Given a valid persisted prefix ending at sequence N:

- replay MUST resume at N+1;
- already committed records MUST remain unchanged;
- the resulting authoritative state/hash MUST equal a clean deterministic replay of the same scenario;
- missing predecessor, sequence gap, malformed record, or conflicting digest MUST fail closed;
- recovery MUST NOT manufacture a missing transition.

## Duplicate/collision semantics

For the same transition identity:

- same canonical input + same digest => IDEMPOTENT;
- same canonical input identity + different digest => INTEGRITY_CONFLICT.

A transition from a competing history MUST NOT be treated as an idempotent duplicate merely because a sequence number matches.

## Provenance linkage

The fixture MUST bind each tested reorg transition to explicit supplied provenance identifiers for the affected evidence/block context.

Missing, ambiguous, or mismatched provenance linkage MUST fail closed.

This step does not define live RPC acquisition semantics; F-05 remains separate.

## Deterministic replay

The verifier/test MUST demonstrate that replaying the same immutable fixture twice produces byte-equivalent deterministic results for:

- validated transition records;
- authoritative contiguous sequence;
- authoritative state;
- latest transition hash;
- preserved canonical/orphan record inventory.

No fixture record may be modified during validation.

## Acceptance tests

At minimum:

### Positive

- canonical chain followed by canonical -> orphaned transition;
- canonical and orphaned records coexist;
- interrupted valid prefix recovers deterministically;
- complete replay equals recovered replay;
- explicit provenance linkage validates.

### Negative

- competing predecessor/fork;
- sequence gap during recovery;
- predecessor mismatch during recovery;
- conflicting duplicate digest;
- sequence collision across competing histories;
- missing provenance linkage;
- mismatched provenance linkage;
- attempted historical record mutation;
- replay result divergence.

## Independence

The executable closure verifier/test MUST be offline and deterministic.

It MUST NOT import production ingestion, raw-store, SQLite runtime state, cursor runtime, live RPC, migration code, or network providers.

## Safety boundary

This step MUST NOT:

- activate V4 production transition handling;
- modify legacy raw evidence;
- reset or manually advance cursors;
- change checkpoint authority;
- migrate production data;
- change the frozen transition object semantics;
- merge historical PR #28;
- introduce predictive/ranking/trading/signing/publication behavior.

## Traceability

Required chain:

F-02 -> STEP 489 contract -> independent implementation -> executable scenario fixtures/tests -> verified run -> preserved evidence

Implementation is authorized only after this contract is accepted and merged.

## Gate status

Design Gate 2 remains **NOT PASSED**.

STEP 489 defines the precise missing contract; it does not claim F-02 closure.
