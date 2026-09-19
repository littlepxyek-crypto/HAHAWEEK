# HAHAWEEK V4 — RFC 8785 Conformance Checkpoint

Status: **STEP 3C-B — CONFORMANCE BASELINE**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## Purpose

This checkpoint tests the isolated V4 reference canonicalizer against representative requirements and examples from RFC 8785 (JSON Canonicalization Scheme).

The authoritative source is RFC 8785 from the RFC Editor.

Reference:
- RFC 8785, Section 3.2.2.3 — number serialization
- RFC 8785, Section 3.2.3 — property sorting
- RFC 8785, Section 3.2.4 — UTF-8 generation
- RFC 8785, Section 3.2.2.2 — invalid/lone surrogate rejection

## Covered cases

The executable test suite covers:

1. RFC 8785's non-ASCII property-order example.
2. Representative Appendix B number serialization samples.
3. NaN and Infinity rejection.
4. Lone surrogate rejection.
5. UTF-8 byte generation.

## Important implementation boundary

The current reference implementation uses JavaScript's ECMAScript JSON serialization for primitive values and JavaScript string ordering.

That is intentional but **does not by itself prove complete RFC 8785 conformance**.

The conformance suite must continue to expand before the implementation is declared a complete protocol reference.

In particular:

- full RFC 8785 Appendix B coverage should be added;
- nested object and array ordering should remain covered;
- duplicate JSON property handling must be validated at the parser/input boundary;
- cross-implementation differential testing should be added where practical;
- domain-specific V4 lexical validation remains separate from JCS.

## V4 separation

RFC 8785 governs canonical JSON representation.

It does not define HAHAWEEK blockchain field formats such as:

- chain identifiers;
- block hashes;
- transaction hashes;
- contract addresses;
- topic values.

Those remain V4 domain-contract concerns.

## Safety

This checkpoint:

- does not modify production ingestion;
- does not modify SQLite/runtime state;
- does not modify cursors;
- does not perform migration;
- does not import production evidence;
- does not pass Design Gate 2.

The reference implementation remains isolated from production ingestion.

## Gate 2

Design Gate 2 remains **OPEN**.

The next event-identity vector must only be generated after the V4 lexical rules are authoritative enough to validate the complete eight-field input object.
