# HAHAWEEK V4 — Normative Transition Input Contract

Status: **NORMATIVE — STEP 3C-G**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## 1. Scope

This document freezes the V4 transition input object required before an independent transition validator and executable transition golden vectors are introduced.

It defines only the integrity-critical transition object. It does not modify production ingestion, runtime state, SQLite state, cursor state, legacy evidence, migration state, or live acquisition.

The transition object is a member of the `HAHAWEEK-EVIDENCE-V4-TRANSITION` domain.

## 2. Exact transition object

The transition input object MUST contain exactly these five keys:

```text
evidence_id
from_state
previous_transition_hash
sequence
to_state
```

Unknown keys MUST be rejected. Missing keys MUST be rejected. No defaulting, coercion, normalization, or alternate encoding is permitted.

All five values are strings except `previous_transition_hash`, which is either a canonical transition hash string or null.

## 3. Field contract

### 3.1 evidence_id

`evidence_id` identifies the evidence subject whose state is being transitioned.

It MUST be the canonical V4 hash representation of the event identity:

- lowercase hexadecimal;
- `0x` prefix;
- exactly 32 bytes / 64 hexadecimal characters;
- no uppercase characters;
- no alternate encoding.

The event identity itself is defined by the V4 event-identity contract.

### 3.2 sequence

`sequence` is a V4 protocol unsigned 64-bit integer encoded as a JSON string.

Canonical lexical form:

```text
0
[1-9][0-9]*
```

The numeric value MUST be within:

```text
0 <= sequence <= 18446744073709551615
```

For the first transition:

```text
sequence = "0"
```

For every later transition:

```text
sequence = previous sequence + 1
```

Therefore a gap, duplicate sequence, or backward sequence is invalid.

### 3.3 previous_transition_hash

The first transition MUST contain:

```json
"previous_transition_hash": null
```

Every later transition MUST contain the canonical hash of the immediately preceding valid transition:

- lowercase hexadecimal;
- `0x` prefix;
- exactly 32 bytes / 64 hexadecimal characters.

A later transition with null, a different predecessor, or an invalid lexical form is invalid.

### 3.4 from_state

Allowed V4 evidence states:

```text
OBSERVED
CANONICAL
ORPHANED
```

The first transition MUST have:

```text
from_state = OBSERVED
```

No other initial state is valid.

### 3.5 to_state

Allowed values are the same V4 evidence states:

```text
OBSERVED
CANONICAL
ORPHANED
```

Legal state transitions are frozen as:

```text
OBSERVED  -> CANONICAL
CANONICAL -> ORPHANED
```

The following are invalid:

- OBSERVED -> OBSERVED
- OBSERVED -> ORPHANED
- CANONICAL -> CANONICAL
- CANONICAL -> OBSERVED
- ORPHANED -> OBSERVED
- ORPHANED -> CANONICAL
- ORPHANED -> ORPHANED

ORPHANED is terminal for the affected evidence subject in the V4 transition state machine.

## 4. Transition hash

The transition hash is:

```text
transition_hash =
  hash(
    HAHAWEEK-EVIDENCE-V4-TRANSITION,
    transition_input_object
  )
```

where the V4 generic hash primitive is:

```text
SHA256(
  UTF8(domain)
  || 0x00
  || RFC8785_JCS(input_object)
)
```

The hash is represented canonically as lowercase `0x`-prefixed 32-byte hexadecimal when stored or referenced as a V4 hash value.

The hash MUST be calculated from the exact five-key transition input object. No derived, reordered, omitted, defaulted, or normalized fields may be substituted.

## 5. Chain validity

A transition chain is valid only when all of the following hold:

1. the first transition has sequence `"0"`;
2. the first transition has `previous_transition_hash = null`;
3. the first transition has `from_state = OBSERVED`;
4. each later sequence equals the immediately preceding sequence plus one;
5. each later predecessor hash equals the immediately preceding valid transition hash;
6. every transition object passes the exact-key and lexical contract;
7. every state edge is legal;
8. every transition hash matches its canonical input object.

The authoritative state is derived from the highest contiguous valid transition sequence.

## 6. Duplicate and collision policy

For a transition identity:

```text
same identity + same digest = IDEMPOTENT
same identity + different digest = INTEGRITY_CONFLICT
```

An integrity conflict MUST fail closed.

`INSERT OR IGNORE` MUST NOT be used as a substitute for V4 collision handling.

A sequence value alone is not sufficient as a transition identity. The complete transition input object determines the transition digest.

## 7. Fail-closed conditions

The verifier MUST fail closed for:

- missing key;
- unknown key;
- wrong value type;
- non-canonical uint64;
- uint64 overflow;
- invalid evidence hash;
- invalid predecessor hash;
- invalid state;
- illegal state edge;
- first transition with non-zero sequence;
- first transition with non-null predecessor;
- first transition with `from_state != OBSERVED`;
- sequence gap;
- duplicate/backward sequence;
- conflicting predecessor;
- fork;
- transition hash mismatch;
- conflicting duplicate identity.

## 8. Independence requirement

The transition reference validator MUST NOT import:

- production ingestion;
- legacy raw-store code;
- SQLite runtime state;
- production cursor;
- live RPC provider code;
- production migration code.

The executable validator must operate deterministically from supplied transition objects only.

## 9. Vector requirements

After this contract is merged, executable transition vectors MUST include at minimum:

### Positive

- valid first transition;
- valid subsequent transition;
- valid maximum uint64 sequence where structurally applicable;
- valid predecessor linkage;
- valid OBSERVED -> CANONICAL;
- valid CANONICAL -> ORPHANED.

### Negative

- missing key;
- unknown key;
- wrong type;
- leading-zero sequence;
- signed sequence;
- overflow;
- invalid evidence hash;
- invalid predecessor hash;
- first transition with non-zero sequence;
- first transition with non-null predecessor;
- wrong first `from_state`;
- sequence gap;
- duplicate sequence;
- backward sequence;
- predecessor mutation;
- fork;
- illegal state edge;
- ORPHANED terminal violation;
- hash mutation;
- conflicting duplicate identity.

## 10. Gate status

Design Gate 2 remains **OPEN**.

This contract freezes the transition input boundary. It does not authorize production transition handling.

Next step: implement the independent transition validator and executable positive/negative transition vectors.

## 11. Reference

RFC 8785 JCS is the canonical JSON serialization basis for the V4 hash primitive. The V4 protocol additionally requires the explicit V4 lexical forms defined above; JCS itself does not define blockchain hash/address formats.
