# Cross-Artifact Linkage Contract v0.1

Status: REFERENCE / DESIGN BOUNDARY
Gate 2: NOT PASSED
Production V4 activation: NOT AUTHORIZED

## Purpose

Define the minimum deterministic relationships between independently valid HAHAWEEK-EVIDENCE-V4 artifacts before a unified offline verifier may accept an evidence chain.

This contract does not promote any fixture to production authority and does not authorize a V4 cutover.

## Canonical chain

EVENT → TRANSITION → SEGMENT → MANIFEST → CHECKPOINT → CURSOR

The verifier must validate each relationship explicitly. Valid individual hashes are not sufficient to establish a valid chain.

## Required relationships

### 1. EVENT → TRANSITION

A transition referencing an event must reference an existing event identity.

Required checks:
- referenced event exists;
- event identity matches the transition reference;
- transition sequence is valid for the referenced event.

Failure:
- EVENT_REFERENCE_MISSING
- EVENT_REFERENCE_MISMATCH

### 2. TRANSITION → TRANSITION

For an ordered transition history:
- predecessor relationship must resolve;
- sequence numbers must be contiguous;
- the first transition must satisfy the declared initial-state rule;
- no transition may silently skip or rewrite history.

Failure:
- TRANSITION_PREDECESSOR_MISSING
- TRANSITION_SEQUENCE_GAP
- TRANSITION_SEQUENCE_MISMATCH

### 3. TRANSITION → SEGMENT

A transition record included in a segment must be covered by that segment's declared body/seal.

Required checks:
- record belongs to the declared segment;
- record sequence is within the segment range;
- segment body hash covers the canonical record bytes;
- segment seal references the correct segment identity and body hash.

Failure:
- SEGMENT_RECORD_UNCOVERED
- SEGMENT_SEQUENCE_OUT_OF_RANGE
- SEGMENT_BODY_MISMATCH
- SEGMENT_SEAL_MISMATCH

### 4. SEGMENT → MANIFEST

A manifest must reference the exact segment identity it claims to inventory.

Required checks:
- every referenced segment exists;
- segment identity matches;
- segment generation/sequence is consistent;
- cumulative manifest accounting is deterministic;
- no segment is silently omitted from the declared inventory.

Failure:
- MANIFEST_SEGMENT_MISSING
- MANIFEST_SEGMENT_MISMATCH
- MANIFEST_ACCOUNTING_MISMATCH
- MANIFEST_INVENTORY_GAP

### 5. MANIFEST → CHECKPOINT

A checkpoint must bind to the exact manifest state it represents.

Required checks:
- manifest reference resolves;
- manifest hash matches;
- evidence watermark is not beyond the represented manifest;
- last segment/record references are covered by the manifest.

Failure:
- CHECKPOINT_MANIFEST_MISSING
- CHECKPOINT_MANIFEST_MISMATCH
- CHECKPOINT_WATERMARK_INVALID
- CHECKPOINT_RECORD_UNCOVERED

### 6. CHECKPOINT → CURSOR

A cursor must be derivable from the checkpoint.

Required checks:
- checkpoint reference resolves;
- checkpoint identity matches;
- cursor generation is consistent;
- next_block follows the declared checkpoint rule;
- cursor cannot move backward or skip the declared next block.

Failure:
- CURSOR_CHECKPOINT_MISSING
- CURSOR_CHECKPOINT_MISMATCH
- CURSOR_GENERATION_MISMATCH
- CURSOR_DERIVATION_MISMATCH

## Negative-vector rule

Every relationship must have at least one mutation that is expected to fail.

The verifier must:
1. apply the declared mutation;
2. verify the declared failure code;
3. never normalize the mutation back to a valid artifact;
4. never advance production state.

## Independence requirement

Cross-artifact verification must be executable offline and provider-independent.

It must not:
- mutate production evidence;
- advance a production cursor;
- select an RPC provider;
- perform migration;
- sign transactions;
- infer missing evidence.

## Promotion boundary

This contract is REFERENCE ONLY.

Promotion toward Gate 2 requires:
1. executable positive vectors;
2. executable negative vectors;
3. independent reproduction;
4. clean-checkout CI verification;
5. compatibility with the Unified Offline Verifier Contract;
6. no unresolved authority ambiguity.

Production V4 remains unauthorized until Gate 2 is explicitly passed.
