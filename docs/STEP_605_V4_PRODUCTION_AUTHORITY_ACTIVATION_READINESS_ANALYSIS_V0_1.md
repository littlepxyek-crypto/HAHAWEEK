# STEP 605 — V4 Production Authority Activation Readiness Analysis v0.1

- Phase: ANALYSIS
- Predecessor: STEP 605 Contract/Reconciliation/Documentation
- Baseline: `fcfac43b8a6e65c6fe75f222ec85db5e3807e27d`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Repository inspection

The current repository was inspected at the STEP 605 documentation merge state. The production path now contains:

- `src/core/runtime-processing-context.js` as the VERIFIED processing-context producer;
- `src/core/production-authority-lifecycle.js` as the repository-owned durable lifecycle establishment source;
- `src/core/f03-ingestion-authority-integration.js` as the existing authority gate;
- `src/core/ingestion.js` as the cursor barrier;
- `src/core/single-writer-fence.js` as the writer boundary;
- schema version 8 with append-only `production_authority_lifecycle`;
- `src/index.js` wiring the repository-owned lifecycle source as the default production authority factory.

No production source outside the frozen STEP 605 boundary was modified by this Analysis.

## 2. Lifecycle completeness

The lifecycle source establishes an immutable record from a VERIFIED processing context and the exact expected authority supplied by the existing expected-authority path.

The lifecycle identity is the SHA-256 digest of a domain-separated canonical establishment input. The persisted record captures production commitments, expected commitments, processing identities, lineage, evidence-set identity, predecessor linkage, replacement type, source identity, and establishment-input digest.

The lifecycle table is append-only through UPDATE/DELETE rejection triggers. Persisted state is `DURABLY_ESTABLISHED`. Durable restart behavior and schema 7→8 migration are covered by existing STEP 603 tests.

Finding: **LIFECYCLE BOUNDARY IS CONCRETE AND COMPLETE FOR THE CURRENT ESTABLISHMENT SEMANTICS.**

## 3. Authority-gate ordering

The runtime batch path performs:

1. VERIFIED processing context creation;
2. lifecycle establishment through the default production authority factory;
3. existing authority validation and expected/production binding validation;
4. cursor advancement.

The cursor is not advanced inside lifecycle establishment. `IngestionEngine` advances the cursor only after the authority gate returns successfully.

Finding: **CURSOR ORDERING IS PRESERVED AND FAIL-CLOSED AT THE EXISTING AUTHORITY GATE.**

## 4. Durability and crash/restart

Lifecycle establishment performs an in-memory snapshot, inserts the immutable lifecycle record, calls `database.save()`, re-reads the persisted record, and validates its provenance/commitment fields.

Existing tests cover durable restart and persistence after reopening the database.

However, there is a remaining atomicity concern at the boundary between lifecycle persistence and the subsequent authority-gate validators: the lifecycle source persists before the authority gate completes all downstream validation. If a downstream validator were to reject the returned authority after persistence, the lifecycle row may already be durable even though cursor advancement does not occur. The default repository-owned source constructs the authority from the exact expected input, so the normal path is internally aligned, but the boundary is not independently proven as one atomic acceptance transaction.

Finding: **DURABILITY IS PROVEN; FULL FAILURE-ATOMICITY ACROSS LIFECYCLE PERSISTENCE → FINAL AUTHORITY VALIDATION → CURSOR BARRIER IS NOT YET PROVEN.**

This is an activation-readiness blocker, not a justification for changing production behavior in Analysis.

## 5. Reorg/replacement

The lifecycle source derives predecessor linkage from the durable lifecycle record associated with the parent processing result. REORG_REPLACEMENT requires exactly one predecessor. Replacement receives a new lifecycle identity and remains immutable.

Existing tests demonstrate creation of a distinct replacement lifecycle and append-only protection.

Finding: **REORG IMMUTABILITY/PREDECESSOR BOUNDARY IS CONCRETE.**

Remaining readiness question: integrated runtime tests must prove that a failed or interrupted replacement cannot advance the cursor and that restart observes the intended immutable predecessor/replacement relationship without reconstructing or overwriting history.

## 6. Writer-fence and concurrency

The repository-owned source requires the existing writer fence and checks ownership before establishment and again before persistence. The runtime acquires the same writer fence before constructing the ingestion engine. No second writer or lock is introduced.

Finding: **WRITER OWNERSHIP IS PRESERVED.**

Remaining readiness question: the current lifecycle unit tests prove fence requirements but do not constitute a complete concurrent runtime race/crash matrix across establishment, final authority validation, and cursor advancement.

## 7. Expected versus production authority

The expected authority remains read from the durable F-03 expected-authority path. The authority gate rejects a shared object and validates the production authority separately. The lifecycle record stores both expected and production commitment fields.

Finding: **EXPECTED/PRODUCTION SEPARATION IS PRESERVED.**

No fallback/default authority or alternate provider authority was introduced.

## 8. Cursor boundary

The batch ingestion path explicitly calls the authority gate before `cursor.advance(toBlock)`. Lifecycle establishment itself has no cursor mutation.

Finding: **CURSOR OWNERSHIP REMAINS WITH THE EXISTING INGESTION BARRIER.**

The analysis does not authorize any cursor change.

## 9. Evidence and provenance

The lifecycle binds processing-result ID, execution ID, lineage ID, canonical decision snapshot ID, evidence-set digest, exact range, generation, expected commitments, production commitments, and establishment-input digest.

Raw/canonical evidence is not rewritten or deleted by the lifecycle source.

Finding: **PROVENANCE BINDING IS STRONG ENOUGH FOR THE CURRENT BOUNDARY, SUBJECT TO THE FAILURE-ATOMICITY GAP ABOVE.**

## 10. Operator Acceptance

The runtime already emits processing status, exact range, processing result/execution/lineage identifiers, transition, generation, evidence-set digest, authority outcome, and cursor outcome.

The repository does not establish a dedicated lifecycle-status operator command in the inspected path. Analysis must not invent one.

Finding: **OPERATOR ACCEPTANCE IS PARTIALLY EVIDENCED, BUT REPRODUCIBLE OPERATOR OBSERVABILITY OF THE DURABLE AUTHORITY-LIFECYCLE RECORD ITSELF IS NOT YET ESTABLISHED AS A dedicated repository-defined interface.**

This should be addressed only through a later Contract/Design boundary if required; it is not implemented here.

## 11. Surveillance preservation

No Surveillance implementation or authority path was changed.

The production-authority lifecycle has no Surveillance dependency and does not derive authority, actor identity, ranking, risk, or automated action from Surveillance.

Finding: **SURVEILLANCE BOUNDARY PRESERVED. ADDRESS != ACTOR.**

## 12. Activation-readiness conclusion

STEP 605 establishes a concrete production-authority lifecycle and preserves the frozen cursor, writer-fence, evidence, expected-authority, and Surveillance boundaries.

The repository is **not yet activation-ready** because two readiness properties require explicit proof before a later activation contract:

1. failure-atomicity across durable lifecycle establishment, final authority validation, and cursor advancement;
2. integrated crash/restart/concurrency/reorg evidence proving that the complete runtime boundary remains immutable and fail-closed under interruption or downstream rejection.

Operator lifecycle observability is an additional acceptance concern and must not be solved by inventing commands during Analysis.

Therefore:

**STEP 605 Analysis result: FAIL-CLOSED FOR V4 ACTIVATION.**

No V4 production activation is authorized.

## 13. Smallest next Design boundary

The smallest safe successor Design boundary is limited to **activation-readiness hardening and evidence proof**, not activation itself:

- prove or minimally enforce failure-atomicity without changing the frozen lifecycle schema, identity formula, binding formula, cursor owner, or writer-fence owner;
- add integrated tests for downstream authority rejection after lifecycle establishment;
- add crash/restart/reorg/concurrency evidence at the runtime boundary;
- define, only if required by Operator Acceptance, a repository-grounded observation boundary for durable lifecycle state;
- preserve Surveillance as derived/non-authoritative.

Any implementation requires a new Contract/Design authorization and must not activate V4.

## 14. Traceability

Requirement → STEP 605 Contract → repository inspection → this Analysis → next Design boundary.

No production implementation is authorized by this Analysis alone.
