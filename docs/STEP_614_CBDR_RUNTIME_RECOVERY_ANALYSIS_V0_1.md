# STEP 614 — CBDR Runtime Recovery Analysis v0.1

## Status

ANALYSIS — AUTHORIZED under the existing STEP 614 Contract.

## Finding

**F-614-06 — Durable processing context is not recovered before CBDR reconstruction on an authority-gate retry.**

Actual operator evidence on 2026-09-27 reached:

```
Operational state: UNKNOWN
Cursor: 64986696
Last verified cursor: 64986696
Failure code: CBDR_INTEGRITY_CONFLICT
Failure boundary: RUNTIME
Recoverability: STOP
Evidence impact: PRESERVE
Authority impact: NO_ADVANCE
Recovery required: true
Recovery state: REQUIRED
STOP: FAIL-CLOSED
```

The immediately preceding runtime attempts established this sequence:

1. The exact range `64986697-64986706` was ingested.
2. The canonical identity boundary was repaired by PR #577 and the runtime progressed beyond `CANONICAL_EVIDENCE_IDENTITY_INCOMPLETE`.
3. A retry then reached `F03_CHAIN_NOT_FOUND`, so the cursor correctly remained at `64986696`.
4. The processing-context path can durably persist canonical decision records and a verified processing lineage before the later production-authority gate.
5. A subsequent retry reconstructs canonical decision input using the newer observed decision head.
6. `createRecordDigest()` includes `decision_head_block`, while `persistRecord()` treats a same `(chain_id, block_number, block_hash)` with changed decision-head/provenance commitments as `CBDR_INTEGRITY_CONFLICT`.
7. Therefore a durable verified processing context can become unreachable on retry even though the cursor has not advanced and no evidence should be rewritten.

## Repository evidence

Current `src/core/runtime-processing-context.js` performs:

```text
createCanonicalDecisionInput
→ rawIngest
→ resolveTransition
→ acceptCanonicalLineage
→ return VERIFIED processing context
```

The canonical decision input is created before durable-context recovery is attempted.

Current `src/core/canonical-decision-input.js` establishes that:

- CBDR identity includes `decision_head_block`.
- Same block hash with changed decision-head/confirmation/source commitments fails closed.
- Snapshot reconstruction verifies members, record integrity, parent linkage, and snapshot digest.
- Competing canonical branches are preserved rather than overwritten.

Current `src/core/ingestion.js` advances the cursor only after processing context and the authority gate succeed. Therefore the observed cursor `64986696` is consistent with the failed authority boundary and must not be reset.

## Root cause

The failure is a recovery-order defect, not a justification to overwrite CBDR.

The retry path attempts to create a new temporal CBDR before checking whether an exact-range, already-verified processing lineage/snapshot is durably present. Because the new observation may have a different decision head, the integrity layer correctly rejects the replay.

This creates a recovery dead-end:

```text
durable VERIFIED processing context
        ↓
authority failure
        ↓
cursor remains behind
        ↓
retry
        ↓
new decision head
        ↓
CBDR conflict
        ↓
durable context is not reused
```

## Contract check

This finding is within the existing STEP 614 Contract.

It concerns:

- durable-state recovery;
- failure diagnosis;
- recovery from LAST VERIFIED STATE;
- evidence preservation;
- cursor non-advancement;
- operator-visible failure behavior.

It does **not** require changing:

- raw/canonical evidence semantics;
- deterministic identity rules;
- CBDR digest semantics;
- authority semantics;
- cursor advancement rules;
- Surveillance authority;
- V4 production-authority meaning;
- trading/signing/execution.

No Contract Amendment is required for the bounded recovery implementation.

## Required recovery invariant

For an exact-range durable VERIFIED processing lineage:

1. Inspect durable lineage/snapshot first.
2. Reconstruct and verify the stored snapshot.
3. Verify the current provider network and the relevant canonical block identities before reusing it.
4. If the stored canonical identity remains valid, reuse the existing processing context without creating a new CBDR.
5. If canonical identities differ, do not silently reuse the old context; proceed through the existing reorg/replacement semantics.
6. If durable state is incomplete or contradictory, fail closed.
7. Never delete, overwrite, normalize, or reset existing CBDR, lineage, evidence, or cursor.

## Security / failure-isolation implications

The recovery path must preserve:

- historical CBDRs;
- temporal provenance;
- snapshot integrity;
- lineage integrity;
- raw/canonical evidence;
- cursor durability;
- fail-closed behavior on contradiction.

The recovery path must not treat an older durable snapshot as authoritative merely because it exists. Reuse is permitted only after its integrity and applicable current canonical identity are verified.

## Analysis conclusion

F-614-06 is a bounded STEP 614 runtime recovery defect.

The next authorized phase is **DESIGN** for a recovery-first implementation that reuses an already-verified exact-range processing context only after durable-state and current canonical-identity verification, while preserving all existing integrity and authority boundaries.

No runtime data is to be deleted or rewritten to resolve this finding.
