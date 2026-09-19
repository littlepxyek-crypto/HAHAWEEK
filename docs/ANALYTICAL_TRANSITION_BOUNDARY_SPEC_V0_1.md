# HAHAWEEK — ANALYTICAL TRANSITION BOUNDARY SPEC v0.1

Status: Draft
Scope: Formation, Hypothesis, Validation, and Identity analytical state transitions.
Dependencies: V4 transition contract, Evidence Graph, Temporal & Validation, Identity Resolution, Threat Model, Cross-Spec Reconciliation Audit.

## 1. PURPOSE

Separate analytical state transitions from the frozen V4 evidence transition contract.

V4 transition authority answers whether an evidence state transition is valid.

Analytical transitions answer how HAHAWEEK's derived objects change epistemic state.

They are different protocols and must never share an identity, hash domain, schema, or authority assumption.

## 2. AUTHORITY BOUNDARY

V4:
evidence integrity → canonicality → authoritative evidence state.

Analytical layer:
evidence references → graph projection → formation/hypothesis/validation/identity state.

An analytical transition can reference V4 evidence, but cannot mutate or supersede V4 evidence state.

A failed analytical transition never changes raw evidence.

## 3. TRANSITION DOMAINS

Each analytical state machine has its own domain:

FORMATION:
HAHAWEEK-EVIDENCE-V4-FORMATION-TRANSITION

HYPOTHESIS:
HAHAWEEK-EVIDENCE-V4-HYPOTHESIS-TRANSITION

VALIDATION:
HAHAWEEK-EVIDENCE-V4-VALIDATION-TRANSITION

IDENTITY:
HAHAWEEK-EVIDENCE-V4-IDENTITY-TRANSITION

No analytical transition may use HAHAWEEK-EVIDENCE-V4-TRANSITION as its domain.

## 4. COMMON TRANSITION INPUT

The exact common identity input is:

{
  "entity_id": "0x...",
  "from_state": "...",
  "sequence": "0",
  "to_state": "..."
}

Rules:
- exact four keys;
- all values strings;
- unknown/missing keys rejected;
- sequence is canonical uint64 decimal string;
- entity_id is the identity of the analytical entity;
- state values come from the state machine registry;
- no coercion or silent normalization.

An implementation may add a separate transition record containing reason, evidence references, temporal fields, actor, contradiction references, and provenance, but those fields are not part of the transition identity unless a future domain-specific contract explicitly freezes them.

## 5. TRANSITION ID

For domain D and canonical identity input O:

analytical_transition_id =
SHA256(
  UTF8(D)
  || 0x00
  || UTF8(RFC8785_JCS(O))
)

This follows V4 canonicalization discipline but uses a distinct analytical domain.

The transition ID is not a V4 evidence transition ID.

## 6. PREDECESSOR / SEQUENCE

Each analytical state machine has an independent contiguous sequence.

First transition:
sequence = "0"
previous transition = null

Later transition:
sequence = previous sequence + 1
previous transition = exact immediately preceding analytical transition ID.

A gap, conflicting predecessor, fork, or conflicting duplicate identity is invalid.

The analytical chain is not allowed to alter the V4 transition chain.

## 7. LEGAL STATE TRANSITIONS

### Formation

DETECTED → OBSERVING
OBSERVING → MATURING
MATURING → CONFIRMED
MATURING → PARTIALLY_VERIFIED
MATURING → INCONCLUSIVE
MATURING → UNKNOWN
MATURING → DISSOLVED

DISSOLVED has no outgoing transition.

DISSOLVED is not triggered merely by one event. A defined formation outcome predicate must support the transition.

### Hypothesis

PROPOSED → UNDER_EVIDENCE
UNDER_EVIDENCE → READY_FOR_VALIDATION
READY_FOR_VALIDATION → SUPPORTED
READY_FOR_VALIDATION → CONTRADICTED
READY_FOR_VALIDATION → MIXED
READY_FOR_VALIDATION → INCONCLUSIVE
READY_FOR_VALIDATION → WITHDRAWN

Terminal-state policy must be frozen before executable vectors.

### Validation

PENDING → WINDOW_OPEN
WINDOW_OPEN → WINDOW_CLOSED
WINDOW_CLOSED → EVALUATING
EVALUATING → VALIDATED
EVALUATING → PARTIALLY_VALIDATED
EVALUATING → INVALIDATED
EVALUATING → INCONCLUSIVE
EVALUATING → UNKNOWN

A validation cannot enter EVALUATING before its validation window is closed.

### Identity

PROPOSED → ACTIVE
ACTIVE → STRENGTHENED
ACTIVE → WEAKENED
ACTIVE → REJECTED
STRENGTHENED → WEAKENED
STRENGTHENED → REJECTED
WEAKENED → STRENGTHENED
WEAKENED → REJECTED

REJECTED has no outgoing transition unless a future explicit re-opening contract is defined.

## 8. REASON / EVIDENCE / TEMPORAL RECORD

Analytical transition records should preserve:

- transition_id
- entity_id
- from_state
- to_state
- sequence
- previous_transition_id
- reason
- evidence_ref[]
- contradiction_ref[]
- missing_evidence[]
- event_time
- observation_time
- processing_time
- actor
- configuration_version

These are provenance/record fields.

They must not silently become part of identity until the applicable analytical transition contract explicitly freezes them.

## 9. EVIDENCE REFERENCES

Every non-genesis analytical transition must reference sufficient evidence or prior analytical state to explain the transition.

A transition cannot manufacture evidence.

For example:

Formation:
MATURING → CONFIRMED
must reference the relevant closed validation and its supporting evidence.

Hypothesis:
READY_FOR_VALIDATION → SUPPORTED
must reference a non-UNKNOWN validation.

Identity:
ACTIVE → STRENGTHENED
must reference new corroborating evidence.

## 10. REORG INTERACTION

A V4 canonicality transition may cause an analytical object to require re-evaluation.

The process is:

V4 evidence transition
→ affected graph projection
→ affected analytical window
→ new analytical evaluation
→ new analytical transition.

An analytical transition never edits the V4 transition history.

## 11. DUPLICATE POLICY

Same analytical transition identity + same canonical identity input:
- idempotent.

Same sequence/entity/predecessor context with conflicting transition identity:
- integrity conflict;
- fail closed.

Never use latest-wins semantics.

## 12. RECOVERY

Recovery of an analytical chain requires:

1. verify entity identity;
2. verify each transition identity;
3. verify domain;
4. verify sequence;
5. verify predecessor;
6. verify legal state edge;
7. verify referenced evidence;
8. reject gaps/forks/conflicts.

Analytical recovery must not be treated as V4 checkpoint recovery.

## 13. CROSS-LAYER INVARIANTS

A1 Analytical state is derived state.
A2 V4 evidence authority is immutable.
A3 Analytical transitions cannot modify V4 transitions.
A4 Different analytical state machines have independent chains.
A5 Future validation evidence cannot retroactively alter formation history.
A6 Every terminal analytical state is reproducible from evidence + versioned rules.
A7 Ambiguous predecessor or authority fails closed.
A8 Re-evaluation creates a new transition; history is not overwritten.

## 14. REQUIRED NEGATIVE VECTORS

At minimum:
1. analytical transition using V4 transition domain → reject;
2. wrong entity type/domain → reject;
3. missing key → reject;
4. unknown key → reject;
5. non-canonical sequence → reject;
6. first sequence not zero → reject;
7. non-null first predecessor → reject;
8. sequence gap → reject;
9. wrong predecessor → reject;
10. illegal state edge → reject;
11. transition referencing unavailable evidence → reject;
12. validation evaluating before window closure → reject;
13. future evidence influencing formation transition → reject;
14. duplicate identity with conflicting digest → reject;
15. analytical transition attempting to mutate V4 evidence state → reject.

## 15. OPEN CONTRACTS

This boundary spec does not yet freeze:
- complete per-state-machine object schemas;
- state-specific transition identity inputs beyond the common boundary;
- formation/hypothesis/validation entity identity contracts;
- exact actor/provenance schema;
- source independence contract;
- Identity L4/L5 contract.

Those must be separate, versioned specifications.

## 16. DESIGN GATE

Status: OPEN.

No production analytical transition implementation is authorized by this document alone.

## 17. CORE RULE

V4 tells us:

“Is the evidence transition authoritative?”

Analytical transition tells us:

“What does HAHAWEEK currently infer from that evidence?”

The second can never rewrite the first.
