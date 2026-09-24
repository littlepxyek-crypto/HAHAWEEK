# STEP 583 — Runtime Canonical Lineage / Processing Context Integration Implementation Analysis v0.1

Status: ANALYSIS
Step: 583
Baseline: `8e71caf7a3789763bce390e3dbc2cf6ca7f3a8cd`
Contract: `docs/STEP_583_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_IMPLEMENTATION_ANALYSIS_DESIGN_CONTRACT_V0_1.md`
V4 production activation: INACTIVE

## 1. Executive finding

The current main repository contains the canonical decision, runtime lineage, durable processing-result, authority, database snapshot, cursor, and writer-fence primitives required by STEP 582. The remaining gap is orchestration: `src/index.js` still reports raw ingestion success to `IngestionEngine`, and `src/core/ingestion.js` treats that return as sufficient to invoke authority and advance the cursor.

The smallest safe implementation is therefore an orchestration adapter at the existing `createEngine()` / `processorRange` boundary, plus a narrow authority-gate binding extension and tests. No new persistence mechanism, lock, cursor schema, or canonicality owner is required.

## 2. Actual current call graph

Current production path:

`createEngine()`
→ `RawLogIngestion.ingestRange(fromBlock,toBlock)`
→ raw-event writes
→ `database.save()`
→ counter result
→ `IngestionEngine.runOnce()`
→ `authorityGate({ checkpointCommitted:true, fromBlock,toBlock,blockNumber:toBlock })`
→ `cursor.advance(toBlock)`.

The current authority gate validates:
- explicit authority source;
- distinct expected authority source;
- exact range;
- production authority structure;
- expected-authority binding digest.

It does not currently receive or validate a STEP 579/568 verified processing context.

## 3. Existing semantic owners

### Canonical decision input

`src/core/canonical-decision-input.js` owns the confirmation-safe block-header snapshot. `createCanonicalDecisionInput()` validates chain identity, confirmation depth, exact range, block headers, parent links, persists immutable decision records/snapshot members, and returns `reconstructSnapshot()`.

It requires the existing writer fence and must remain the only source of the canonical block-hash snapshot.

### Runtime canonical lineage

`src/core/runtime-canonical-lineage.js` owns transition type, parent, generation, canonical evidence membership, deterministic processing identities, lineage identity, and append-only transition history.

`acceptCanonicalLineage()` validates the exact snapshot/range, creates canonical evidence from raw events, derives deterministic result/execution/lineage identities, invokes STEP 568 persistence, persists canonical lineage, saves, and reconstructs the resulting lineage.

It already restores its own database snapshot when its own operation has not committed. The outer integration must additionally protect the entire processing unit, including canonical-decision writes and raw ingestion, before durable processing success.

### Durable processing result

`src/core/processing-result-persistence.js` owns evidence re-verification, deterministic evidence-set digest, immutable result persistence, replay/conflict detection, generation/parent constraints, and save-failure restoration.

`readProcessingResult()` returns a verified context including result identity, execution identity, parent, transition, range, generation, evidence IDs, digest, provenance, and committed time.

### Authority

`src/core/f03-ingestion-authority-integration.js` owns the final authority/expected-authority comparison. `src/core/f03-authority-binding.js` binds segment, manifest, checkpoint, generation, and cursor block.

The authority layer must not become canonicality or generation authority. The verified runtime context supplies generation; authority only proves its own independently sourced commitment is consistent with that context.

### Cursor

`src/core/block-cursor.js` remains a downstream block checkpoint writer. Its API takes a block number only. STEP 583 does not authorize a cursor redesign. The verification barrier must therefore remain in the caller immediately before `advance()`.

### Database and writer fence

`src/core/database.js` already exposes `snapshot()`, `restore()`, and `save()`. `src/core/single-writer-fence.js` is the sole writer ownership mechanism. No second mechanism is needed.

## 4. Critical gaps against STEP 582

### GAP-01 — No canonical snapshot in processorRange

`src/index.js` does not call `createCanonicalDecisionInput()`.

Result: raw log presence is currently sufficient to reach the authority gate.

### GAP-02 — Processing unit is not transactionally bounded at orchestration level

The raw ingestion path saves before canonical lineage/result verification. If canonical processing later fails, the outer operation must restore the pre-operation database snapshot rather than leave an unverified raw-only checkpoint candidate.

The outer snapshot must be captured before canonical decision acquisition and restored for failures before successful durable processing context.

### GAP-03 — Authority has no verified-context input

Current `createAuthorityGate()` receives only `checkpointCommitted`, range, and block number.

The implementation needs a narrow context input and must reject anything except a verified processing context whose exact range matches and whose generation agrees with the independently sourced authority commitment.

### GAP-04 — Cursor is only structurally downstream

The cursor itself cannot know why it is being advanced. This is acceptable under the frozen contract if the caller performs the exact-context verification barrier immediately before `advance()`.

### GAP-05 — Restart orchestration is missing

STEP 568/579 can reconstruct durable processing/lineage records, but `IngestionEngine.runOnce()` does not currently consult a verified durable context before treating a range as checkpointable.

The implementation must preserve idempotent replay and must not fabricate a new result merely because the cursor did not advance after a later-stage failure.

## 5. Exact safe orchestration boundary

The production adapter should conceptually be:

`processCanonicalRange({ fromBlock, toBlock, ... })`

It should:
1. validate exact range;
2. assert writer ownership;
3. capture the outer database snapshot;
4. create the canonical decision snapshot for the exact range;
5. ingest raw evidence for the exact range;
6. invoke STEP 579 `acceptCanonicalLineage()`;
7. require reconstructed VERIFIED lineage/result;
8. return an immutable verified processing context.

The existing `processorRange` callback becomes the single integration boundary consumed by `IngestionEngine`.

## 6. Outer snapshot semantics

The outer snapshot must be taken before canonical decision input because canonical decision persistence itself mutates the database.

Failure before durable processing success:
- restore outer snapshot;
- do not call authority;
- do not advance cursor;
- preserve all previously committed history.

After STEP 579/568 durable processing succeeds, the immutable result/lineage is historical evidence.

If authority rejects after that point, the integration must not delete or rewrite the durable result. Cursor remains unchanged. The next retry must discover the durable deterministic context and validate it rather than create a conflicting duplicate.

## 7. Authority binding analysis

The existing authority record exposes `generation` and `cursorBlock`, while exact range is independently checked by `createAuthorityGate()`.

Therefore the minimal safe binding is:
- processing context status must be VERIFIED;
- context range must equal requested range;
- authority range must equal requested range;
- authority generation must equal processing-context generation;
- authority cursor block must equal the requested `toBlock` where that field represents the checkpoint endpoint;
- existing expected-authority binding remains intact.

Processing-result ID, execution ID, parent ID, transition type, lineage ID, and evidence digest remain evidence-owned fields. They must not be manufactured by authority.

## 8. Replay/restart

For unchanged canonical state and identical range:
- canonical snapshot identity is deterministic;
- STEP 579 processing result/execution/lineage identities are deterministic;
- STEP 568 persistence is idempotent;
- reconstructed context must be identical;
- no new generation is created.

If canonical state changed, STEP 579 determines `REORG_REPLACEMENT` and generation change. The adapter does not infer or override this.

A restart after durable processing but before cursor advancement must reuse the durable verified context and then re-enter the authority barrier.

## 9. Reorg

The adapter must pass the canonical snapshot unchanged into STEP 579.

STEP 579 remains the sole owner of:
- transition selection;
- parent;
- generation;
- canonical evidence membership;
- replacement identity.

Prior canonical lineage/evidence remains append-only. No cursor reset or historical rewrite is permitted.

## 10. Concurrency

The existing writer fence remains sole ownership.

The adapter must assert ownership before:
- canonical decision;
- raw/lineage mutation;
- durable processing;
- outer save/return;
- authority;
- cursor.

No second mutex or lock is justified.

## 11. Failure matrix

| Failure point | Required outcome |
|---|---|
| invalid range | reject before writes |
| canonical decision failure | restore outer snapshot; no authority/cursor |
| snapshot/range mismatch | restore; no authority/cursor |
| raw ingestion failure | restore; no authority/cursor |
| lineage/persistence conflict | restore; no authority/cursor |
| evidence/digest mismatch | restore/reject; no cursor |
| writer-fence loss | fail closed; no cursor |
| reconstruction mismatch | fail closed; no cursor |
| authority range mismatch | no cursor |
| authority generation mismatch | no cursor |
| authority binding mismatch | no cursor |
| cursor regression/write failure | fail closed; durable evidence preserved if already committed |
| concurrent conflicting identity | reject; no conflicting history |
| restart after durable result | reconstruct and retry authority without duplicate result |

## 12. Operator observability finding

Current `src/index.js` reports:
- chain ID;
- latest block;
- safe head;
- processed count;
- cursor.

It does not report:
- verified processing-result ID;
- processing-execution ID;
- lineage ID;
- transition;
- generation;
- evidence-set digest;
- authority outcome;
- explicit reason a cursor was not advanced.

This is a real operator usability gap. The next implementation design should expose these fields through the existing runtime result/log boundary without creating a second source of truth. A later dedicated operator-facing CLI/UI enhancement can be separated if required; STEP 583 does not authorize an unrelated interface project.

## 13. Test impact

Required implementation tests should cover:
- exact snapshot/range binding;
- raw-only success cannot advance cursor;
- verified context is required by authority;
- generation mismatch;
- authority cursor/range mismatch;
- deterministic replay;
- restart after durable processing before cursor;
- reorg replacement and history preservation;
- outer snapshot restoration;
- writer-fence loss;
- concurrent same-range conflict;
- existing STEP 568/579 vectors unchanged.

## 14. Security conclusion

The trust chain is:

canonical decision snapshot
→ exact raw evidence
→ STEP 579 lineage
→ STEP 568 durable verified result
→ exact authority binding
→ cursor.

The current code breaks the chain between raw ingestion and canonical verification. The proposed adapter repairs only that missing orchestration edge and does not introduce a new trust root.

V4 production activation remains INACTIVE.
