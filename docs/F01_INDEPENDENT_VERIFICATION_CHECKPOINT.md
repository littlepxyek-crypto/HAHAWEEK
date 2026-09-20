# HAHAWEEK — F-01 Independent Verification Checkpoint

Status: **F-01 VERIFIED — SUBJECT TO GATE 2 REVIEW**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## Purpose

This checkpoint records an independent verification pass for the V4 event-identity
lexical contract and its canonical golden vector.

The verifier intentionally does **not** import the V4 reference implementation.
It independently:

1. checks the exact eight-field identity key set;
2. checks canonical uint64 lexical forms and uint64 range;
3. checks canonical lowercase 32-byte hash/topic forms;
4. checks canonical lowercase 20-byte contract-address form;
5. sorts the eight string-valued fields canonically;
6. generates UTF-8 canonical bytes;
7. computes the domain-separated SHA-256 digest; and
8. compares both canonical bytes and digest against the committed golden vector.

## Evidence

- Normative lexical contract: `docs/V4_NORMATIVE_LEXICAL_FORMS.md`
- Golden vector: `docs/golden-vectors/event-identity.json`
- Independent verifier: `scripts/verify-v4-event-identity-independent.js`
- Executable test: `tests/independent-event-identity-verifier.test.js`

The existing reference implementation and existing event-identity tests remain unchanged.

## Independence boundary

The verifier does not import:

- `src/reference/v4/event-identity.js`
- `src/reference/v4/jcs.js`
- `src/reference/v4/hash.js`

It uses only Node.js built-ins for filesystem, UTF-8 encoding, sorting, and SHA-256.

Because the current event-identity golden vector contains only string-valued identity fields,
the independent canonicalization path is sufficient to verify this vector without implementing
general RFC 8785 number serialization.

General RFC 8785 conformance remains governed by its existing dedicated conformance suite.

## Result

F-01 evidence now has independent executable verification for the event-identity vector.

This does **not** by itself close all Design Gate 2 controls. F-02 through F-05 and H-01 through
H-05 remain subject to their own executable evidence and review.

## Safety boundary

This checkpoint does not:

- modify production ingestion;
- modify SQLite/runtime state;
- modify cursors;
- migrate evidence;
- rewrite historical evidence;
- activate V4 production authority.

Design Gate 2 remains **OPEN** pending the remaining controls and final review.
