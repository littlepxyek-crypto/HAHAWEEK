# STEP 587 — Runtime Canonical Lineage / Processing Context Integration Analysis v0.1

Status: ANALYSIS
Step: 587
Baseline: 74908d8c44fe181b2beadf3db1547889dce92b98
V4 production activation: INACTIVE

## Finding

The repository has the canonical-decision, runtime-lineage, durable-result, authority, cursor, database snapshot, and writer-fence primitives required by STEP 584. The remaining production blocker is semantic: **INITIAL and REORG_REPLACEMENT generation has no approved runtime establishment source independent of authority and cursor state.**

Current `acceptCanonicalLineage()` requires explicit generation for INITIAL and REORG_REPLACEMENT; CONTINUATION inherits the persisted parent generation. STEP 571/579 prohibit deriving generation from cursor, expected/submitted authority, checkpoint/manifest digests, timestamps, randomness, default `0`, or arbitrary hashes. The existing F-03 generation helper only validates a supplied generation.

Therefore production implementation must not invent a generation rule. A dedicated generation contract is required before code.

## Current call graph

`createEngine()`
→ `RawLogIngestion.ingestRange()`
→ `database.save()`
→ `processorRange()` resolves
→ `IngestionEngine.runOnce()`
→ authority gate
→ cursor advance.

The processor does not yet construct canonical decision or verified processing context.

## Owner map

- `canonical-decision-input.js`: confirmation-safe block-header decision snapshots, exact range, parent linkage, deterministic identity, persistence/replay.
- `runtime-canonical-lineage.js`: canonical evidence membership, transition history, result/execution/lineage identities, parent/generation validation, STEP 568 invocation.
- `processing-result-persistence.js`: immutable result/evidence verification and digest.
- `f03-ingestion-authority-integration.js`: independent submitted/expected authority validation.
- `block-cursor.js`: downstream checkpoint only.
- `single-writer-fence.js`: sole write ownership.

## Safe implementation seams

1. Add one orchestration adapter for canonical decision → raw ingestion → STEP 579 → STEP 568.
2. Extend `IngestionEngine` only to carry the verified context to authority and keep cursor downstream.
3. Extend authority binding only to validate exact verified context; authority cannot become canonicality/generation authority.
4. Capture an outer database snapshot before canonical-decision persistence and restore it for failures before durable processing-result success.
5. After durable result success, preserve historical evidence if authority/cursor fails.

## Replay/restart/reorg

CONTINUATION is deterministic from a persisted accepted parent and inherits its generation.

REORG_REPLACEMENT remains blocked until a valid new generation can be established under a contract. STEP 579 itself must remain the sole owner of transition semantics.

Identical replay must resolve to the same result/execution/lineage identities and evidence digest.

## Failure-closed matrix

- range/snapshot mismatch → reject; no authority/cursor;
- raw failure → restore outer snapshot; no authority/cursor;
- evidence/result conflict → fail closed;
- writer-fence loss → fail closed;
- reconstruction mismatch → fail closed;
- authority mismatch → no cursor;
- cursor failure → preserve durable evidence;
- missing continuation parent → fail closed;
- missing initial/replacement generation → **blocked until generation contract**.

## Observability

Current output lacks verified result ID, lineage ID, generation, transition, evidence digest, authority outcome, and cursor-not-advanced reason. These may be projected from the verified context only; they must not become a second source of truth.

## Test mapping

Implementation must test exact snapshot/range, verified context shape, raw-only cannot advance cursor, replay/restart, continuation, reorg after generation establishment, authority mismatch, digest tampering, fence loss, outer restore, cursor regression, concurrency, and unchanged STEP 578/579 vectors.

## Disposition

No production code is changed in STEP 587. V4 production activation remains INACTIVE.

Next required contract: Runtime Generation Establishment Contract.
