# STEP 556 — F-03 Cursor Boundary Contract Amendment v0.1

Status: CONTRACT AMENDMENT
Step: 556
Baseline: STEP 555 reconciled on `main`
Amends: STEP 554 F-03 Dedicated SQLite Authoritative-Chain Persistence Implementation Contract v0.1

## 1. Purpose

Resolve the STEP 555 implementation blocker by explicitly defining the authoritative source of the STEP 550 `cursorBlock` field.

This amendment selects **Model A — Segment boundary is the cursor authority**.

The normative rule is:

`cursorBlock := persisted verified segment.toBlock`

This is a contract-level linkage invariant. It is not an implementation convenience, submitted-authority field, independently mutable persistence field, or cursor-state migration.

This amendment authorizes no V4 production activation and does not declare Design Gate 2 PASS.

## 2. Existing repository and contract boundary

STEP 554 already defines the durable chain:

`verified segment -> verified manifest -> verified checkpoint`

The segment contains:

- `segment_id`;
- `from_block`;
- `to_block`;
- `segment_digest`;
- `generation`;
- immutable provenance;
- committed timestamp.

STEP 550/F-03 production authority requires:

- `segmentId`;
- `manifestDigest`;
- `checkpointDigest`;
- `generation`;
- `cursorBlock`.

STEP 556 closes the previously identified gap without adding a new schema field.

## 3. Normative cursor-boundary rule

For every valid durable F-03 authority chain:

`cursorBlock == f03_segments.to_block`

The value MUST be obtained exclusively from the persisted, verified segment selected by `readF03AuthorityChain({ fromBlock, toBlock })`.

The implementation MUST NOT:

- accept `cursorBlock` from submitted live authority as the expected value;
- accept a caller-supplied cursor boundary as authoritative;
- read the runtime/state-file cursor as the expected-authority source;
- derive the value from an unpersisted in-memory segment;
- create an independent mutable cursor field in the F-03 chain;
- rewrite the segment boundary to match a cursor;
- reset or migrate the existing cursor as part of this amendment.

## 4. Exact-range relationship

For an exact read request:

`readF03AuthorityChain({ fromBlock, toBlock })`

the selected persisted segment MUST satisfy:

`segment.from_block == fromBlock`

and

`segment.to_block == toBlock`

The returned STEP 550 authority MUST therefore contain:

`cursorBlock == toBlock == segment.to_block`

No range expansion, contraction, nearest-match, latest-wins, or normalization is permitted.

Zero candidates, multiple candidates, or any range mismatch MUST fail closed.

## 5. Persistence model

No independent `cursorBlock` column or separate cursor-authority record is added by this amendment.

The authoritative cursor boundary is persisted indirectly but immutably through the segment's committed `to_block` field.

The durable provenance for the segment remains authoritative evidence for the boundary. Segment provenance MUST contain the exact `fromBlock` and `toBlock` already required by STEP 554.

The STEP 550 expected-authority reader MUST construct `cursorBlock` only after verifying:

1. the segment row is durable;
2. the exact requested range matches the segment;
3. the segment digest is valid;
4. segment provenance agrees with the persisted boundary;
5. manifest linkage and digest are valid;
6. checkpoint linkage and digest are valid;
7. generation continuity is valid.

## 6. Integrity and conflict behavior

The following conditions MUST fail closed:

- persisted `segment.to_block` is not an exact integer;
- persisted `segment.from_block > segment.to_block`;
- requested `toBlock` differs from persisted `segment.to_block`;
- segment provenance boundary differs from the persisted segment boundary;
- any segment/manifest/checkpoint identity or digest linkage conflicts;
- generation continuity conflicts;
- more than one authoritative candidate exists for the exact range;
- the durable chain cannot be independently verified.

The implementation MUST classify a persisted identity/content disagreement according to STEP 554 collision rules, including `INTEGRITY_CONFLICT` where applicable.

No repair may be performed from submitted authority or runtime cursor state.

## 7. Submitted authority separation

The submitted live authority remains a separate input to the existing authority gate.

The expected authority source MUST be durable and independently read from the F-03 chain.

The submitted authority MAY contain a `cursorBlock` because the frozen production authority contract requires it, but that value MUST be validated against the durable expected authority by the existing cryptographic binding.

It MUST NOT be used to manufacture, populate, repair, or override the expected authority.

The expected authority's `cursorBlock` MUST originate from:

`durable f03_segments.to_block`

only.

## 8. Cursor ordering invariant

The existing execution invariant remains:

`evidence -> durable authoritative chain -> durable expected authority -> authority validation/binding -> cursor`

The cursor MUST advance only after:

1. the authoritative chain is durably persisted;
2. the expected authority is independently read from that durable chain;
3. submitted authority validates;
4. cryptographic authority binding succeeds.

A failed durable persistence, expected-authority read, linkage verification, or authority binding MUST leave the cursor unchanged.

This amendment does not alter the existing cursor persistence mechanism.

## 9. Restart and durability semantics

After process restart, the expected authority MUST be reconstructible solely from the durable F-03 chain.

The runtime cursor/state file MUST NOT become a substitute for missing F-03 authority evidence.

If the durable chain is absent, incomplete, corrupt, ambiguous, or range-inconsistent, the expected-authority read MUST fail closed even if runtime cursor state exists.

After a failed database export, the previous durable SQLite file remains authoritative under STEP 554. An unexported in-memory segment MUST NOT establish a cursor boundary.

## 10. Concurrency semantics

The cursor boundary is immutable as part of the segment identity/content.

Concurrent identical chain commits remain idempotent under STEP 554.

Concurrent conflicting segment boundaries or integrity-critical content MUST fail closed and MUST NOT replace the existing segment.

Readers MUST never synthesize a cursor boundary by combining records from different competing chains.

Writer fencing and SQLite transaction behavior from STEP 554 remain mandatory.

## 11. Reorg and historical evidence

A reorg or competing historical segment MUST NOT mutate an existing committed segment boundary.

Any new authoritative segment identity/generation required by an existing frozen reorg contract must be committed under that contract's explicit linkage and provenance rules.

This amendment does not authorize historical rewriting, deletion, normalization, or cursor reset.

## 12. STEP 550 integration contract

The durable expected-authority API remains equivalent to:

`readF03AuthorityChain({ fromBlock, toBlock })`

Its returned authority tuple MUST be:

```
{
  segmentId: persistedSegment.segment_id,
  manifestDigest: persistedManifest.manifest_digest,
  checkpointDigest: persistedCheckpoint.checkpoint_digest,
  generation: persistedChainGeneration,
  cursorBlock: persistedSegment.to_block
}
```

The tuple MUST be produced only after independent durable-chain verification.

The reader MUST NOT accept a caller-supplied authority object as an alternative source.

The existing authority validator and authority binding remain unchanged.

## 13. Required executable tests for implementation

The implementation following this amendment MUST prove:

### Positive

- exact segment range produces `cursorBlock == segment.to_block`;
- exact STEP 550 tuple is deterministic across repeated reads;
- restart reconstructs the same cursor boundary from durable SQLite;
- identical chain retry preserves the same cursor boundary;
- the expected authority remains independent from submitted authority.

### Negative

- requested `toBlock` differs from persisted `segment.to_block`;
- segment provenance `toBlock` differs from persisted `to_block`;
- malformed persisted boundary;
- multiple candidates for an exact range;
- missing segment;
- missing manifest;
- missing checkpoint;
- segment/manifest/checkpoint digest conflict;
- generation conflict;
- submitted `cursorBlock` differs from durable expected `cursorBlock`;
- submitted authority attempts to supply an expected cursor boundary when durable chain is absent;
- runtime cursor exists while durable F-03 chain is absent;
- failed durable export followed by restart.

All failures MUST be fail-closed.

## 14. Security and regression requirements

This amendment MUST preserve:

- cryptographic authority binding;
- checkpoint-before-cursor;
- legacy write barrier;
- writer fencing;
- durable-file boundary;
- raw/canonical evidence integrity;
- recovery behavior;
- reorg evidence;
- frozen normative checkpoint contract;
- historical artifacts;
- existing golden vectors and tests.

No V4 production activation is authorized.

## 15. Acceptance criteria

STEP 556 contract amendment is complete when:

1. Model A is explicitly selected and frozen;
2. `cursorBlock == segment.to_block` is normative;
3. exact-range semantics are fixed;
4. no independent cursor persistence is introduced;
5. durable provenance requirements are fixed;
6. submitted-authority separation is fixed;
7. cursor ordering is fixed;
8. restart/durability semantics are fixed;
9. concurrency/conflict semantics are fixed;
10. reorg/history constraints are fixed;
11. STEP 550 reader output is fixed;
12. implementation test obligations are fixed;
13. security/regression obligations are fixed;
14. V4 remains inactive.

## 16. Explicit prohibitions

This amendment does NOT authorize:

- cursor reset;
- cursor migration;
- historical rewrite;
- evidence deletion;
- silent normalization;
- replacement of frozen contracts;
- independent cursor-authority persistence;
- V4 activation;
- Design Gate 2 PASS;
- bypassing the existing authority gate;
- using runtime cursor state as expected authority.

## 17. Traceability

STEP 552 Contract
-> STEP 553 Analysis/Design
-> STEP 554 Implementation Contract
-> STEP 555 Implementation Analysis Finding
-> STEP 556 Cursor Boundary Contract Amendment
-> STEP 555 implementation continuation
-> Test
-> Security/Regression
-> CI
-> Review
-> Merge
-> Post-Merge Verification
-> Reconciliation
-> Documentation
-> Next STEP.
