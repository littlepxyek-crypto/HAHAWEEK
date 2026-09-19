# HAHAWEEK V4 — Transition Input Contract Audit

Status: **STEP 3C-F — AUDIT BEFORE EXECUTABLE TRANSITION VECTORS**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## 1. Purpose

This audit establishes exactly what the current V4 reference model says about transitions before an executable transition golden vector or validator is introduced.

The objective is to prevent invented transition fields or semantics from becoming protocol truth.

No production ingestion, runtime state, evidence, SQLite state, cursor state, or migration artifact is modified by this document.

## 2. Established transition semantics

The V4 Canonical Reference Model establishes these invariants:

- Transition domain: `HAHAWEEK-EVIDENCE-V4-TRANSITION`.
- The first transition has sequence `0`.
- The first transition has `previous_transition_hash = null`.
- The first transition has `from_state = OBSERVED`.
- Each later transition references the immediately preceding valid transition.
- Authoritative state is derived from the highest contiguous valid transition.
- Gaps fail closed.
- Conflicting predecessors fail closed.
- Forks fail closed.
- Conflicting duplicate identities fail closed.
- Evidence state includes `OBSERVED`, `CANONICAL`, and `ORPHANED`, subject to legal V4 transitions.
- Reorg handling is an explicit observation plus explicit transitions; historical artifacts are not overwritten or deleted.

These are protocol-level facts already present in the reference model.

## 3. What is NOT yet frozen

The current reference model does **not** provide an exact transition object key set.

In particular, it does not yet normatively specify:

- the complete transition object fields;
- the transition identity key set;
- whether a transition carries an explicit event/evidence identity field;
- the exact field name and representation for the destination state;
- whether an operation/reason field is part of the integrity object;
- timestamp fields, if any;
- actor/writer provenance fields, if any;
- transition sequence lexical constraints beyond the general V4 unsigned-64-bit integer rule;
- the exact lexical form of `previous_transition_hash`;
- the exact transition hash preimage beyond the generic domain-separated hashing primitive;
- duplicate identity fields specific to transitions.

Therefore these fields must **not** be invented in the executable validator or golden vector at this stage.

## 4. Known state vocabulary

The current V4 model explicitly names:

```text
OBSERVED
CANONICAL
ORPHANED
```

The first transition is explicitly:

```text
sequence = 0
previous_transition_hash = null
from_state = OBSERVED
```

The model also states that state is derived from the valid contiguous transition chain rather than from a mutable current-state field alone.

This audit does not infer additional states or legal transition edges.

## 5. Required transition contract before vectors

Before creating an executable transition vector, a normative transition-input contract must freeze at least:

1. exact object key set;
2. exact type of every key;
3. sequence lexical and range rules;
4. exact predecessor-hash lexical form;
5. exact state field names and allowed values;
6. transition identity definition;
7. transition hash preimage;
8. nullability rules;
9. unknown-key behavior;
10. legal transition/gap/fork semantics.

Only after those rules are authoritative should executable positive and negative transition vectors be generated.

## 6. Negative-test boundary

Once the contract is frozen, required negative families include:

- missing required key;
- unknown key;
- wrong type;
- sequence zero/non-zero boundary mutation;
- sequence gap;
- sequence duplicate;
- predecessor mutation;
- null/non-null predecessor mutation;
- invalid predecessor lexical form;
- invalid state;
- illegal state transition;
- fork/conflicting predecessor;
- conflicting duplicate identity;
- hash mismatch.

These are test requirements, not currently executable protocol rules.

## 7. Independence

Transition reference work must remain independent of:

- production ingestion;
- legacy raw storage;
- SQLite runtime state;
- production cursor;
- production acquisition;
- live RPC providers.

The reference implementation, vectors, and offline verifier must remain deterministic and provider-independent.

## 8. Gate 2

Design Gate 2 remains **OPEN**.

This audit is a prerequisite boundary for STEP 3C-F. It does not claim transition-vector completion and does not authorize production V4 transition handling.

## 9. Next

Freeze the normative V4 transition object contract, then implement the independent validator, executable golden vector, and negative transition/recovery fixtures.

