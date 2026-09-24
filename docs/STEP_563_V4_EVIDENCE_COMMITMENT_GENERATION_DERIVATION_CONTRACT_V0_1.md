# STEP 563 — V4 Evidence Commitment & Generation Derivation Contract v0.1

Status: CONTRACT
Step: 563
Precondition: STEP 562 BLOCKED / RECONCILED
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the missing deterministic semantics required before implementing the submitted/live V4 authority producer.

This contract defines:

- the exact canonical evidence set consumed for an exact processed range;
- deterministic segment identity and segment digest derivation;
- deterministic manifest identity and manifest digest derivation;
- the authoritative role of generation;
- checkpoint derivation linkage;
- provenance requirements;
- replay, recovery, reorg, concurrency, and fail-closed behavior.

This contract does not activate V4 production authority.

## 2. Repository-grounded constraints

The implementation MUST preserve the existing:

- canonical evidence identity/hash model;
- RFC 8785/JCS canonicalization where already frozen by the evidence layer;
- F-03 segment → manifest → checkpoint persistence;
- F-03 checkpoint digest domain and formula;
- production authority validation;
- cryptographic authority binding;
- durable expected-authority source;
- writer fencing;
- cursor semantics;
- historical evidence.

No existing frozen contract or golden vector may be silently changed.

## 3. Terms

### 3.1 Processed range

An exact inclusive range:

`[fromBlock, toBlock]`

with integer `fromBlock <= toBlock`.

The range is supplied by the successful processing operation and MUST NOT be reconstructed from the runtime cursor.

### 3.2 Canonical evidence item

A persisted `canonical_evidence` record that is linked to raw evidence belonging to the exact processed range and whose canonical evidence identity is complete and internally valid.

### 3.3 Generation

Generation is an explicit canonical-processing lineage value.

It is NOT manufactured by the submitted authority producer.

The producer MUST receive generation from the completed canonical processing result/context and MUST reject a missing, malformed, or conflicting generation.

The producer MUST NOT:

- copy generation from durable expected authority;
- derive generation from the runtime cursor;
- derive generation from wall-clock time;
- derive generation from writer-fence number;
- derive generation from arbitrary hash truncation;
- silently substitute generation `0` for a missing value.

Generation MUST satisfy the existing F-03 generation contract: canonical decimal unsigned integer string, bounded by uint64.

For a deterministic retry of identical canonical processing evidence, the supplied generation MUST be identical.

A canonical reorg/replacement MAY establish a new generation only through a new canonical processing result/context. The authority producer itself does not decide that transition.

## 4. Exact canonical evidence set

For a processed range `[fromBlock,toBlock]`, the producer MUST consume exactly the canonical evidence belonging to that range.

The set MUST satisfy all of:

1. block number >= `fromBlock`;
2. block number <= `toBlock`;
3. raw-event linkage exists;
4. evidence identity is complete;
5. canonical evidence is internally valid;
6. the evidence belongs to the currently accepted canonical processing result;
7. no orphaned/reorg-invalid item is included;
8. no item outside the exact range is included.

The producer MUST fail closed if the evidence set is missing, incomplete, ambiguous, malformed, or contains an invalid canonicality/provenance condition.

An empty range result is not equivalent to missing evidence. If the processing contract permits a legitimately empty range result, that condition MUST be represented explicitly by the processing result and covered by a golden vector; otherwise the producer MUST reject an empty evidence set.

## 5. Deterministic ordering

Canonical evidence items MUST be ordered before commitment construction using this exact lexicographic tuple:

1. `block_number` ascending;
2. `transaction_index` ascending, with null forbidden for authority-eligible evidence;
3. `log_index` ascending;
4. `raw_event_id` ascending;
5. `evidence_id` ascending.

The producer MUST reject duplicate authority keys:

`(block_number, transaction_index, log_index, raw_event_id)`

and MUST reject two different canonical records claiming the same authority key.

No database row order, insertion order, object-key order, filesystem order, or query-plan order may influence commitment construction.

## 6. Evidence commitment leaf

Each ordered evidence item contributes a deterministic leaf object containing only authority-relevant canonical fields:

`evidence_id`
`identity_schema_version`
`identity_hash`
`raw_event_id`
`raw_hash`
`canonical_hash`
`interpretation_status`
`block_number`
`transaction_index`
`log_index`
`transaction_hash`
`block_hash`

The leaf MUST be canonicalized using the repository's frozen JCS implementation and hashed with a new domain-separated SHA-256 domain:

`HAHAWEEK-EVIDENCE-V4-SEGMENT-LEAF`

No implementation may use an unqualified SHA-256 hash.

## 7. Segment commitment

The segment commitment payload is:

```json
{
  "contract": "HAHAWEEK-EVIDENCE-V4-SEGMENT-V0.1",
  "from_block": "<decimal string>",
  "to_block": "<decimal string>",
  "generation": "<decimal uint64 string>",
  "leaf_count": "<decimal string>",
  "leaf_hashes": ["<64 lowercase hex>", "..."]
}
```

The payload MUST be canonicalized using the frozen JCS implementation.

The segment digest is:

SHA-256(
  UTF-8("HAHAWEEK-EVIDENCE-V4-SEGMENT-V0.1\0") ||
  canonical_JCS(payload)
)

The resulting digest is lowercase 64-character hexadecimal without a `0x` prefix.

This digest is the authoritative `segmentDigest`.

## 8. Segment identity

The segment identity MUST be:

`seg:v1:<segment_digest>`

No random UUID, timestamp, database row id, or mutable cursor value may be used.

For identical canonical evidence, exact range, and generation, segment identity MUST be identical.

## 9. Manifest commitment

The manifest payload is:

```json
{
  "contract": "HAHAWEEK-EVIDENCE-V4-MANIFEST-V0.1",
  "from_block": "<decimal string>",
  "to_block": "<decimal string>",
  "generation": "<decimal uint64 string>",
  "segment_id": "seg:v1:<segment_digest>",
  "segment_digest": "<64 lowercase hex>"
}
```

The manifest digest is:

SHA-256(
  UTF-8("HAHAWEEK-EVIDENCE-V4-MANIFEST-V0.1\0") ||
  canonical_JCS(payload)
)

The resulting digest is lowercase 64-character hexadecimal without a `0x` prefix.

The manifest identity MUST be:

`manifest:v1:<manifest_digest>`

Identical segment commitments MUST produce identical manifest identity/digest.

## 10. Checkpoint linkage

The existing frozen F-03 checkpoint derivation remains authoritative and MUST NOT be replaced.

Given `generation` and `manifestDigest`, the checkpoint digest MUST be the existing `checkpointDigestFor(generation, manifestDigest)` result.

The submitted producer MUST NOT implement a second checkpoint formula.

The resulting checkpoint identity is the checkpoint digest itself.

## 11. Cursor boundary

The submitted authority candidate MUST carry:

- `fromBlock`;
- `toBlock`;
- `cursorBlock`.

The candidate is valid only when:

`cursorBlock == toBlock`

and `toBlock` is the successfully processed exact range end.

The producer MUST never advance or persist the runtime cursor.

## 12. Submitted authority record

The producer output MUST contain at least:

```text
fromBlock
toBlock
segmentId
segmentDigest
manifestId
manifestDigest
checkpointDigest
generation
cursorBlock
bindingDigest
provenance
```

All commitments MUST be mutually coherent.

The binding digest MUST be generated by the existing authority-binding implementation. A second binding algorithm is prohibited.

## 13. Provenance

The submitted candidate provenance MUST identify:

- exact range;
- generation;
- canonical evidence commitment;
- segment identity/digest;
- manifest identity/digest;
- checkpoint digest;
- cursor boundary;
- producer contract/version;
- processing-result identity;
- canonical evidence count;
- deterministic execution context required to reproduce the candidate.

Provenance is evidence, not an input that may be regenerated after a mismatch.

A mismatch MUST fail closed.

## 14. Independence from expected authority

The submitted producer MUST NOT import, call, or depend on:

`readF03AuthorityChain()`

or the durable expected-authority factory.

Expected authority remains independently resolved by the authority gate.

The following are prohibited:

- expected → submitted copying;
- submitted → expected derivation;
- self-comparison;
- using expected commitments to repair a submitted candidate;
- using expected generation to fill a missing generation.

The candidate MUST remain independently reproducible from the completed canonical processing result.

## 15. Persistence ordering

The required sequence remains:

1. writer ownership acquired;
2. exact range processed;
3. canonical evidence/checkpoint artifacts durably committed;
4. processing result made immutable for the candidate;
5. submitted authority derived;
6. durable expected authority resolved independently;
7. submitted authority structurally validated;
8. cryptographic binding validated;
9. cursor advancement permitted.

A failure at steps 2–8 MUST prevent cursor advancement.

The producer itself MUST NOT mutate cursor state.

## 16. Recovery and deterministic replay

For identical:

- canonical evidence;
- exact range;
- generation;
- processing-result identity;

the producer MUST return byte-for-byte equivalent commitment material after canonical serialization.

Repeated execution MUST NOT create alternate segment/manifest identities.

A durability failure MUST NOT manufacture a replacement candidate from a different source.

Restart MUST replay the same range deterministically.

## 17. Reorg semantics

A reorg-invalidated evidence item MUST NOT be silently reused.

If the canonical processing result changes, the old candidate becomes invalid for the new result.

The producer MUST fail closed when:

- evidence references an invalidated canonical boundary;
- block hash linkage conflicts;
- evidence identity conflicts;
- generation conflicts;
- processing-result identity conflicts.

Historical evidence MUST remain preserved.

A new candidate requires a new canonical processing result/context and its associated generation.

## 18. Concurrency and fencing

The producer MUST execute under the existing writer-fence ownership.

Before commitment construction and before returning the candidate, ownership MUST remain valid.

Writer loss MUST fail closed.

The producer MUST not create a second writer or mutate durable expected-authority state.

Read-only verification MUST remain non-mutating.

## 19. Negative cases required

Implementation MUST provide executable evidence for:

- missing evidence;
- empty evidence where not explicitly permitted;
- incomplete evidence;
- malformed canonical evidence;
- wrong range;
- duplicate authority key;
- block-hash conflict;
- identity conflict;
- canonical-hash conflict;
- generation missing;
- generation malformed;
- generation conflict;
- segment digest tampering;
- manifest digest tampering;
- checkpoint digest mismatch;
- cursor boundary mismatch;
- binding mismatch;
- durable expected authority missing;
- durable expected authority ambiguous;
- expected/submitted self-reference attempt;
- durability failure;
- writer-fence loss;
- reorg-invalid evidence;
- deterministic restart replay.

## 20. Golden vectors

STEP 563 freezes the commitment formulas but does NOT modify existing frozen vectors.

Implementation MUST add new dedicated vectors for:

1. one valid exact-range result;
2. multiple evidence items with deterministic ordering;
3. empty-result behavior if and only if explicitly supported;
4. generation transition input;
5. tampered leaf;
6. reordered leaves;
7. range mutation;
8. generation mutation;
9. manifest mutation;
10. checkpoint mutation;
11. reorg-invalid evidence;
12. deterministic replay.

Existing V4 golden vectors remain authoritative and must continue to pass.

## 21. Security properties

The construction MUST provide:

- domain separation;
- deterministic canonicalization;
- exact-range binding;
- generation binding;
- evidence-set binding;
- segment → manifest → checkpoint linkage;
- fail-closed tamper detection;
- source independence;
- no cursor mutation during candidate construction;
- no historical evidence deletion/replacement.

Collision resistance is inherited from the selected SHA-256 construction; no claim stronger than the underlying hash primitive may be made.

## 22. V4 activation boundary

This contract does NOT:

- activate V4;
- replace legacy authority;
- change RPC/provider selection;
- migrate/reset cursor;
- rewrite historical evidence;
- alter frozen F-01..F-05 or H-01..H-05 contracts;
- introduce external publication/signing/trading/prediction behavior.

V4 activation remains a separate explicit acceptance gate.

## 23. Acceptance criteria

STEP 563 is complete only when:

1. this contract is merged to `main`;
2. PR-head HAHAWEEK Tests are GREEN;
3. PR-head Security/Regression is GREEN;
4. review confirms deterministic commitment formulas, generation source separation, and fail-closed behavior;
5. merge evidence is recorded;
6. exact merge commit is checked for post-merge workflow evidence;
7. reconciliation is documented;
8. next implementation step is explicitly recorded.

No production implementation is claimed by this contract step.

## 24. Traceability

Requirement → STEP 562 implementation finding → STEP 563 contract → implementation → golden vectors/tests → Security/Regression → CI → review → merge → post-merge verification → reconciliation → next STEP.

## 25. Next STEP

STEP 564 — V4 Evidence Commitment & Generation Derivation Implementation.
