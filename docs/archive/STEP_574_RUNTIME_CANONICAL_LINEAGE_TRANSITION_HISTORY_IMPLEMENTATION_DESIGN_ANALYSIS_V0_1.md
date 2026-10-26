# STEP 574 — Runtime Canonical Lineage / Transition-History Implementation Design & Analysis v0.1

Status: DESIGN / ANALYSIS
Step: 574
Predecessor: STEP 573
Starting commit: `62075e423fdeb628da2de4f3cd111112383052a2`
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Objective

Translate the frozen STEP 573 contract into the smallest repository-compatible implementation boundary without changing frozen semantics or writing production code prematurely.

## 2. Repository inspection

The starting main state was inspected before design.

Relevant facts:

- `src/core/database.js` is schema version 5 and already owns raw, canonical evidence, F-03, and processing-result persistence.
- `processing_results` already persists parent result, transition type, range, generation, canonical status, evidence membership, digest, provenance, and committed timestamp.
- `processing-result-persistence.js` validates supplied generation and transition semantics but intentionally does not establish lineage.
- `src/v4/f02-reorg-verifier.js` already provides deterministic validation of `OBSERVED -> CANONICAL` and `CANONICAL -> ORPHANED`, including predecessor/sequence checks and transition hashing.
- `src/core/f03-generation-recovery.js` validates supplied generation but is not a runtime generation authority.
- `src/core/single-writer-fence.js` provides the required operational concurrency primitive.
- `src/core/ingestion.js` still treats `processorRange` success as sufficient to reach the authority gate and cursor advancement.
- `src/index.js` currently performs raw ingestion and database save only; it does not construct canonical lineage or processing-result context.
- No runtime durable transition-history table or canonical-lineage state owner exists.

Therefore the implementation can reuse existing cryptographic/evidence validation primitives but must add a dedicated runtime lineage boundary.

## 3. Design principles

1. **Repository-owned lineage is authoritative.** RPC responses are inputs to raw evidence acquisition, not canonicality authority.
2. **Immutable facts are append-only.** Historical transition records and accepted processing results are never mutated/deleted.
3. **Lookup state is reconstructible.** Any mutable current-state index must be derivable and verifiable from immutable records.
4. **Generation is lineage state.** It is persisted as an explicit semantic value and never derived from operational metadata.
5. **STEP 568 remains a consumer.** The new lineage owner supplies its already-frozen context to existing persistence.
6. **Expected authority remains independent.** It is verification output, never an input to canonicality or generation.
7. **Cursor remains downstream.** It advances only after processing-result persistence and authority binding.
8. **Fail closed.** Ambiguity, conflict, incomplete evidence, lost writer ownership, or non-deterministic replay aborts the range.

## 4. Proposed module boundary

Create:

`src/core/runtime-canonical-lineage.js`

Responsibilities:

- validate exact range;
- acquire/verify writer ownership through supplied fence;
- construct/verify canonical evidence from persisted raw events;
- append immutable transition records;
- reconstruct current canonical state;
- resolve processing lineage and generation;
- deterministically derive processing identities;
- construct the STEP 568 processing context;
- persist through `persistProcessingResult`;
- expose a verified accepted context.

Non-responsibilities:

- RPC log acquisition;
- expected-authority derivation;
- submitted-authority derivation;
- cursor mutation;
- modification of STEP 563 commitment formulas;
- direct V4 activation.

The module should receive dependencies explicitly so tests can use deterministic fakes without changing production semantics.

## 5. Durable schema design

Schema version becomes 6 through an additive migration.

### 5.1 `canonical_transitions`

Proposed columns:

- `transition_id TEXT PRIMARY KEY`
- `evidence_id TEXT NOT NULL`
- `from_state TEXT NOT NULL`
- `to_state TEXT NOT NULL`
- `sequence TEXT NOT NULL`
- `previous_transition_hash TEXT NULL`
- `transition_hash TEXT NOT NULL`
- `provenance_json TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Constraints:

- states restricted to `OBSERVED`, `CANONICAL`, `ORPHANED`;
- edges restricted to the two STEP 573 edges;
- sequence is a canonical unsigned decimal string;
- first transition requires sequence `0` and null predecessor;
- later transition requires non-null predecessor;
- transition hash is unique;
- `(evidence_id, sequence)` is unique;
- no foreign key is used to rewrite canonical history.

The database table is append-only by application contract. UPDATE/DELETE must be rejected by the runtime repository API and covered by regression tests.

### 5.2 `canonical_lineage`

Proposed columns:

- `lineage_id TEXT PRIMARY KEY`
- `from_block INTEGER NOT NULL`
- `to_block INTEGER NOT NULL`
- `processing_result_id TEXT NOT NULL UNIQUE`
- `parent_result_id TEXT NULL`
- `transition_type TEXT NOT NULL`
- `generation TEXT NOT NULL`
- `canonical_evidence_set_digest TEXT NOT NULL`
- `provenance_json TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Purpose:

This is a reconstructible lineage index linking an exact canonical range to the accepted immutable processing result and its generation.

It is not allowed to become a second processing-result authority. Its content must be cross-verified against `processing_results`.

The canonical evidence membership remains owned by `processing_result_evidence`.

### 5.3 Migration

v5 -> v6 SHALL be additive and transactional.

Fresh database SHALL create v6 directly.

Existing v5 rows remain byte-for-byte untouched.

Migration failure SHALL roll back.

Exact schema assertions SHALL be added.

## 6. Transition identity and digest design

The existing F-02 verifier already uses:

`HAHAWEEK-EVIDENCE-V4-TRANSITION`

and canonicalized transition fields:

- evidence_id;
- from_state;
- previous_transition_hash;
- sequence;
- to_state.

STEP 574 design therefore reuses this existing transition digest semantic instead of creating a competing transition hash formula.

### 6.1 Transition hash

`transition_hash = SHA-256(domain || NUL || canonical_JCS(transition_payload))`

where:

`domain = HAHAWEEK-EVIDENCE-V4-TRANSITION`

and the payload contains exactly the five F-02 transition fields above.

### 6.2 Transition ID

To distinguish record identity from its integrity digest:

`transition_id = tr:v1:<transition_hash>`

This is deterministic, immutable, and contains no randomness.

The implementation must verify that the generated ID and stored hash agree.

### 6.3 Provenance

Provenance remains outside the transition hash so operational persistence metadata does not change semantic transition identity.

The persisted provenance must still be canonical JCS JSON and must identify the evidence subject and durable record.

## 7. Canonical state reconstruction

For each evidence ID:

1. load all transition records;
2. order by sequence;
3. verify genesis;
4. verify predecessor hash;
5. verify sequence continuity;
6. verify each transition hash;
7. apply the permitted state edges;
8. derive the latest state.

The only valid final states are:

- CANONICAL;
- ORPHANED.

An OBSERVED-only subject is not eligible for processing-result membership.

Any integrity conflict fails closed.

The reconstructed state must be deterministic independent of SQLite row insertion order.

## 8. Canonical evidence admission design

For each raw event in the exact range:

1. verify immutable raw-event presence;
2. construct canonical evidence deterministically;
3. require complete identity;
4. verify raw hash;
5. verify canonical hash;
6. persist canonical evidence idempotently;
7. ensure a valid OBSERVED transition exists;
8. determine whether the evidence belongs to the accepted canonical lineage;
9. append CANONICAL or ORPHANED transition only when the lineage decision explicitly requires it.

The implementation must not treat all raw events as canonical.

Because the repository currently lacks an independent canonical block oracle, STEP 574 does not invent a new external canonicality source. The next implementation must consume the repository-approved canonical decision input explicitly; if that input is absent, the runtime must fail closed rather than infer canonicality from RPC presence.

## 9. Processing lineage design

### INITIAL

- no accepted parent for the exact lineage boundary;
- explicit initial generation supplied through the canonical-lineage input;
- no parent result;
- deterministic processing identities.

### CONTINUATION

- accepted parent exists;
- parent generation is read from persisted lineage;
- generation is exactly equal to parent;
- no numeric increment;
- exact canonical membership determines the new result identity.

### REORG_REPLACEMENT

- accepted parent exists;
- canonical decision identifies a replacement;
- invalidated parent evidence becomes ORPHANED through transition history;
- replacement evidence receives CANONICAL transitions;
- replacement generation is explicitly supplied by the canonical-lineage decision;
- replacement result has parentResultId;
- old processing result remains immutable.

The runtime cannot manufacture a replacement generation merely by `parentGeneration + 1` unless a later contract explicitly authorizes that rule.

## 10. Processing identities

### 10.1 Result identity

Proposed deterministic payload:

```
{
  contract: "HAHAWEEK-RUNTIME-PROCESSING-RESULT-ID-V1",
  from_block: String(fromBlock),
  to_block: String(toBlock),
  transition_type,
  parent_result_id,
  generation,
  canonical_evidence_ids
}
```

Canonical evidence IDs must be ordered using the STEP 563 authority ordering before identity derivation.

Proposed identity:

`pr:v1:<sha256(domain || NUL || canonical_JCS(payload))>`

This must be covered by golden vectors.

### 10.2 Execution identity

Because STEP 573 requires deterministic replay, execution identity cannot be random.

Proposed payload:

```
{
  contract: "HAHAWEEK-RUNTIME-PROCESSING-EXECUTION-ID-V1",
  processing_result_id,
  exact_range,
  generation
}
```

Proposed identity:

`px:v1:<sha256(domain || NUL || canonical_JCS(payload))>`

A replay of the same persisted lineage context resolves to the same execution identity.

A changed canonical result changes the result identity and therefore the execution identity.

The exact formulas must be implemented and golden-vector-tested before production acceptance.

## 11. Runtime call ordering

The safe integration shape is:

```
writerFence.assertOwned()
  -> rawLogs.ingestRange()
  -> database.save()
  -> runtimeCanonicalLineage.processRange()
      -> canonical evidence
      -> transition history
      -> lineage/generation
      -> processing identities
      -> persistProcessingResult()
  -> independent submitted authority
  -> expected authority + binding
  -> cursor.advance()
```

The runtime lineage owner must assert writer ownership before canonical acceptance and again before processing-result persistence.

The cursor must remain outside the lineage module.

## 12. Reorg atomicity

A reorg operation should commit its immutable transition facts and accepted processing-result context as one database transaction where possible.

The required atomic unit is:

- transition records;
- lineage index;
- processing result;
- processing result evidence membership.

If persistence fails, the database snapshot/transaction must restore the pre-operation state.

Existing historical records must not be rolled back selectively or rewritten.

## 13. Recovery design

Recovery reconstructs state from immutable transition history and processing results.

It must verify:

- transition chain;
- latest state;
- lineage index against processing result;
- generation;
- processing-result digest;
- evidence membership.

A corrupted index must be reconstructible from immutable records or fail closed; it must never silently self-heal by changing historical facts.

## 14. Concurrency design

The existing writer fence remains the only operational ownership mechanism.

The lineage repository must:

- require the fence;
- assert ownership before writes;
- reject stale ownership;
- prevent duplicate conflicting lineage commits;
- make identical replay idempotent.

The fence number is not semantic data.

## 15. Acceptance test matrix

The implementation following STEP 574 must add tests for:

### Transition history

- OBSERVED genesis;
- OBSERVED -> CANONICAL;
- CANONICAL -> ORPHANED;
- invalid edges;
- invalid genesis;
- sequence gap;
- predecessor mismatch;
- transition hash mismatch;
- deterministic transition ID;
- duplicate idempotence;
- conflicting duplicate;
- historical preservation;
- row-order-independent reconstruction.

### Lineage

- INITIAL;
- CONTINUATION;
- REORG_REPLACEMENT;
- missing parent;
- wrong generation;
- forbidden implicit generation increment;
- changed canonical membership;
- invalidated evidence excluded;
- empty canonical result.

### Identity

- result identity golden vector;
- execution identity golden vector;
- replay identity stability;
- changed-outcome identity divergence;
- collision/conflict rejection.

### Persistence/recovery

- v5 -> v6 migration;
- fresh v6 schema;
- transaction rollback;
- corrupted transition history;
- corrupted lineage index;
- writer fence loss;
- concurrent conflicting writes.

### Integration

- cursor does not advance before durable processing-result + authority binding;
- expected authority remains independent;
- raw ingestion failure leaves cursor unchanged;
- canonical ambiguity fails closed.

## 16. Security / regression analysis

Security-sensitive invariants:

- no historical mutation;
- no arbitrary generation;
- no canonicality from RPC presence;
- no expected-authority circularity;
- no cursor-derived authority;
- no random semantic identity;
- no transition-chain truncation;
- no silent conflict resolution;
- no partial reorg commit;
- no stale-writer commit.

Regression boundary:

- STEP 563 commitment formula untouched;
- STEP 568 evidence-set digest untouched;
- F-03 checkpoint derivation untouched;
- existing F-02 verifier remains valid;
- existing raw-event/canonical-evidence behavior remains intact;
- V4 production activation remains INACTIVE.

## 17. Design disposition

STEP 574 does not modify production code.

The design is sufficiently concrete to support the next implementation step, but production implementation must still verify the proposed schema and identity formulas against all existing tests and frozen contracts.

One critical repository constraint remains:

**The runtime still requires an explicit canonical-decision input.**

The current repository cannot safely infer canonicality from RPC responses. Therefore STEP 575 must first validate/contract the source and exact semantics of the canonical-decision input if an already-frozen source is not found.

## 18. Next step

**STEP 575 — Runtime Canonical Decision Input / Lineage Implementation Readiness Analysis.**

STEP 575 SHALL determine whether an existing repository-owned canonical-decision source satisfies STEP 573, or whether a dedicated contract is required before production implementation.
