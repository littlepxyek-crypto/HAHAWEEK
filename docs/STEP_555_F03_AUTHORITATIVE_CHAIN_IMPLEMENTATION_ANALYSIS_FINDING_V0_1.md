# STEP 555 — F-03 Authoritative Chain Implementation Analysis/Design Finding v0.1

Status: BLOCKED AT ANALYSIS/DESIGN
Step: 555
Baseline: STEP 554 reconciled on `main`

## 1. Purpose

Inspect the implementation boundary before production code changes and verify that the STEP 554 contract is sufficient to implement the required STEP 550 durable expected-authority record without manufacturing missing authority fields.

No production code is authorized until this analysis is resolved.

## 2. Repository evidence

The current production authority record requires:

- `segmentId`;
- `manifestDigest`;
- `checkpointDigest`;
- `generation`;
- `cursorBlock`.

The existing authority binding also cryptographically commits all five fields.

The STEP 554 durable-chain schema defines:

### Segment
- `segment_id`;
- `from_block`;
- `to_block`;
- `segment_digest`;
- `generation`;
- provenance;
- committed timestamp.

### Manifest
- `manifest_id`;
- `manifest_digest`;
- `generation`;
- segment identity/digest;
- provenance;
- committed timestamp.

### Checkpoint
- `checkpoint_digest`;
- `generation`;
- manifest identity/digest;
- provenance;
- committed timestamp.

The STEP 554 read API is required to return the durable authority evidence consumed by STEP 550.

## 3. Blocking ambiguity

The durable chain contract does not define a persisted `cursorBlock` field.

STEP 550/F-03 production authority requires `cursorBlock`.

The current chain contains `to_block`, but the contract does not explicitly state:

`cursorBlock == segment.toBlock`

Nor does it define an independent persisted cursor-boundary commitment inside the authoritative chain.

Therefore the implementation has two unsafe possibilities:

1. manufacture `cursorBlock` from `to_block` without an explicit contract rule; or
2. add a new persisted cursor field/record without an explicit contract.

Both would violate the standing rule against assumptions and against manufacturing authoritative state.

The fact that the values may be semantically expected to coincide is not sufficient evidence to silently encode that relationship.

## 4. Why production code must not change yet

The STEP 554 contract explicitly requires:

- no submitted-authority manufacture;
- durable authority originating from persisted artifacts;
- fail-closed behavior;
- no cursor mutation inside chain persistence.

The implementation cannot safely construct the STEP 550 authority tuple until the contract explicitly defines the cursor boundary.

Changing production code now would require choosing an authority model not yet contracted.

Therefore implementation is stopped before code changes.

## 5. Required contract resolution

The next contract must explicitly choose and freeze one of these protocol models:

### Model A — Segment boundary is the cursor authority

Define:

`cursorBlock := segment.toBlock`

and make this relationship an explicit normative linkage invariant.

The implementation must then prove the value comes from the persisted segment and cannot be supplied by submitted authority.

### Model B — Cursor boundary is an independent durable authority field

Add an explicit immutable `cursorBlock` to the durable authoritative-chain model, with:

- persistence;
- provenance;
- identity;
- conflict behavior;
- linkage;
- exact-range semantics;
- restart durability;
- concurrency behavior;
- validation against the segment range;
- fail-closed mismatch behavior.

### Model C — Dedicated durable authority record

Add a separately persisted authority record containing the complete STEP 550 tuple, linked immutably to segment, manifest, and checkpoint.

That record would need its own exact schema and integrity rules.

No model is selected by this analysis because selecting one would be a protocol decision that belongs in the next contract.

## 6. Additional implementation readiness finding

The STEP 554 contract requires a writer fence at chain commit.

The repository currently provides a concrete `single-writer-fence` and the legacy write barrier can enforce ownership through it.

This part is implementable without a new protocol decision.

The existing database atomic save boundary is also concrete:

`export -> temporary file -> rename`

This can remain the durable-file boundary.

These resolved areas do not remove the cursor-boundary ambiguity.

## 7. Security consequence

If `cursorBlock` were silently derived or accepted from submitted authority, a malformed or malicious authority input could create a durable expected-authority tuple that was not explicitly committed by the authoritative chain contract.

That would weaken the intended invariant:

**No durable authoritative chain → no durable expected authority → no authority binding success → no cursor advancement.**

Therefore fail-closed behavior requires contract resolution before implementation.

## 8. Gate status

F-03 remains CONDITIONAL.

Design Gate 2 remains NOT PASSED.

V4 production authority remains inactive.

No production code was changed in STEP 555.

## 9. Required next STEP

STEP 556 must define the F-03 cursor-boundary contract amendment.

It must explicitly define:

1. source of `cursorBlock`;
2. relationship to segment `toBlock`;
3. persistence requirements;
4. linkage requirements;
5. identity/conflict semantics;
6. provenance;
7. restart/durability behavior;
8. concurrency behavior;
9. fail-closed mismatch cases;
10. exact integration with STEP 550 and the existing cursor ordering.

Only after STEP 556 is merged and reconciled may STEP 555 implementation resume.

## 10. Traceability

STEP 552 Contract
→ STEP 553 Analysis/Design
→ STEP 554 Implementation Contract
→ STEP 555 Implementation Analysis
→ **contract ambiguity: cursorBlock source**
→ STEP 556 Contract Amendment
→ STEP 555 Code
→ Test
→ Security/Regression
→ CI
→ Review
→ Merge
→ Post-Merge Verification
→ Reconciliation
→ Documentation.
