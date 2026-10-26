# STEP 600 — Production Authority Lifecycle Persistence Contract v0.1

- Status: CONTRACT
- Step: 600
- Predecessor: STEP 599 — V4 Production Authority Source Lifecycle Analysis
- Baseline: `913d94e176ba37324a1dbd2d2f704d3bcccc9878`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose
Define the smallest explicit repository-owned boundary required to persist and recover a production authority lifecycle record without promoting expected authority into production authority, inventing lineage/generation semantics, changing cursor ordering, or mutating historical evidence. This contract authorizes subsequent Analysis/Design/Code only; it does not implement, activate, or select a live authority source.

## 2. Ownership
Existing authority remains unchanged: VERIFIED processing context; canonical lineage/generation; raw/canonical evidence; F-03 expected-authority persistence; production-authority validation; existing authority-binding formula; authority gate before cursor advancement; single-writer fence; BlockCursor ordering; recovery/reorg semantics.

The new lifecycle owner SHALL own only: immutable lifecycle identity; lifecycle state; supplied production-authority commitment; binding digest; provenance to VERIFIED processing context; exact range/generation/cursor; expected-authority linkage; establishment/reuse outcome; predecessor/replacement linkage; operator-visible verification. It SHALL NOT calculate generation, canonicality, evidence identity, expected-authority derivation, cursor movement, or writer ownership.

## 3. Explicit lifecycle record
A subsequent implementation SHALL use a new explicit schema-owned lifecycle record. It SHALL NOT overload `f03_segments`, `f03_manifests`, `f03_checkpoints`, `processing_results`, `canonical_lineage`, `ingestion_state`, or the legacy state file.

At minimum represent:
- immutable `authorityLifecycleId`;
- state;
- `segmentId`, `manifestDigest`, `checkpointDigest`, `generation`, `cursorBlock`, `bindingDigest`;
- VERIFIED processing-result/context identity;
- exact `fromBlock`/`toBlock`;
- expected-authority identity sufficient for deterministic verification;
- predecessor/replacement relationship where applicable;
- deterministic provenance and committed establishment metadata.

No field is silently added to the frozen F-03 authority representation.

## 4. Lifecycle states
`UNESTABLISHED` → `CANDIDATE` → `DURABLY_ESTABLISHED`. Invalid/ambiguous states fail closed. Only `DURABLY_ESTABLISHED` may be consumed by the production authority factory.

## 5. Establishment prerequisites
Require: VERIFIED processing context; exact range; matching generation and cursor endpoint; canonical evidence identity/provenance through that context; verified exact F-03 expected-authority chain; production commitment equal to expected commitment; valid existing `bindingDigest`; existing writer-fence ownership; successful durable transaction. No timestamp, cursor-alone value, randomness, default, inference, Surveillance output, or writer state may create missing authority semantics.

## 6. Atomicity and durability
Before commit, no DURABLY_ESTABLISHED record may be observable; cursor and raw/canonical evidence remain unchanged. After commit, the same immutable lifecycle identity must be recoverable. Identical authoritative inputs must classify idempotently; conflicting content for one identity must fail closed. Use the existing database/writer-fence model; no second writer/lock.

## 7. Authority consumption
The production authority factory may consume only a lifecycle record passing lifecycle-state, production-authority, expected-authority, binding, VERIFIED-context, exact range/generation/cursor, and existing writer-fence validation. The existing authority gate remains the final authority boundary. Expected and production sources must remain distinct. No fallback to expected authority.

## 8. Recovery
Recovery must reconstruct the same lifecycle identity from durable state. First establishment creates one identity; restart reuses it; repeated establishment is idempotent; conflicting persisted content is an integrity conflict. Non-deterministic recovery => STOP/FAIL-CLOSED. Cursor advancement remains exclusively after the existing authority gate.

## 9. Reorg/replacement
Never update/overwrite an established lifecycle record. A canonical replacement is a new immutable lifecycle record linked to its predecessor and consumes generation/canonicality/replacement lineage only from existing canonical processing lineage. Same generation+same commitment => idempotent reuse; new canonical generation with explicit replacement lineage => new identity; stale/missing/ambiguous predecessor => reject/STOP. Prior authority remains auditable. No locally manufactured generation/reorg semantics.

## 10. Concurrency
The existing single-writer fence is the sole concurrency authority. Concurrent establishment attempts must converge deterministically or fail closed. No second lock/lease/writer/race protocol.

## 11. Operator Acceptance
No commands are invented by this contract. Subsequent Analysis/Design must identify repository-grounded procedures to inspect source availability, lifecycle state, exact range/generation/cursor, expected-authority linkage, binding/provenance/integrity, recovery/reuse, and STOP conditions. If reproducible procedures cannot be supported, implementation remains blocked.

## 12. Surveillance
Surveillance remains derived, evidence-linked, versioned, reproducible, non-authoritative. It cannot establish/replace authority, mutate evidence, advance cursor, alter lifecycle state, create authority, trigger automated action/trading, or infer actor identity from an address. **ADDRESS != ACTOR.** Temporal leakage remains prohibited.

## 13. Schema evolution
A new lifecycle table/schema is an explicit schema change. Implementation must use the existing migration/versioning mechanism, preserve all existing rows/artifacts, migrate deterministically and fail closed, verify the resulting schema, and test fresh creation plus upgrade from the current supported schema. No rewrite/deletion of F-03, processing, lineage, evidence, cursor, or historical records.

## 14. STOP / FAIL-CLOSED
Remain inactive for absent/ambiguous/partial/corrupt lifecycle state; non-DURABLY_ESTABLISHED state; missing/non-VERIFIED context; range/generation/cursor/evidence conflicts; missing/ambiguous expected authority; invalid binding/provenance; absent writer ownership; non-deterministic recovery; ambiguous replacement; incomplete schema migration; or semantics outside this contract. No cursor reset/manual advance, evidence deletion, historical rewrite, silent normalization, fallback/default authority, or bypass.

## 15. Acceptance criteria
STEP 600 is accepted only when: STEP 599 Analysis is VERIFIED/RECONCILED; Gate 2 PASS; V4 authority INACTIVE/BLOCKED; lifecycle ownership is explicit/non-overlapping; expected and production authority remain distinct; identity/state/provenance/binding/recovery/replacement semantics are explicit; existing generation/lineage/evidence/cursor/writer owners remain unchanged; schema evolution is explicit; operator acceptance is repository-grounded; Surveillance is non-authoritative; no production activation/live RPC cutover is authorized; contract is merged with required CI passing; exact merge commit is post-merge verified; PROJECT_STATE records exact evidence.

## 16. Next lifecycle
After STEP 600 verification/reconciliation: **STEP 601 Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.** If Analysis still finds the boundary cannot be implemented from repository-owned semantics, production authority remains blocked and another explicit contract is required.
