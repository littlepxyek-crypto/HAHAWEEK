# HAHAWEEK — EQC AS-OF TEMPORAL CONTRACT V1

Status: IMPLEMENTED / VERIFIED — CI HEAD 08100615cde2ab538a5e58739f50ec21468e8e9c
Contract: EQC-AS-OF-1.0

## Purpose

Define historical/as-of semantics for the Evidence Query Contract without granting the consumer any authority over canonical evidence.

## Normative semantics

An EQC evidence query MAY include:

`temporal.as_of`

The value MUST be an RFC3339-compatible timestamp parseable by the runtime.

When `as_of` is supplied, canonicality MUST be reconstructed only from authoritative append-only `canonical_transitions` records whose `committed_at <= as_of`.

The query MUST NOT consult a later transition and MUST NOT substitute current canonicality for historical canonicality.

## State mapping

- `CANONICAL` transition → `CANONICAL`
- `ORPHANED` transition → `ORPHANED`
- no authoritative transition at/before `as_of` → `UNKNOWN`

`UNKNOWN` is not negative evidence.

## Temporal boundary

The returned object MUST expose:

- requested `as_of`
- reconstructed canonicality
- selected transition metadata, when available
- consistency.canonicality

The query layer does not invent checkpoint/manifest/snapshot identifiers when they are not available for the requested time.

## Security boundary

As-of is read-only. It MUST NOT:

- mutate transitions;
- mutate canonical evidence;
- mutate cursor/checkpoint/manifest;
- select or activate authority;
- rewrite history.

## Determinism

Given the same immutable evidence and transition history, the same `as_of` query produces the same temporal state.

## Explicit limitation

This contract closes the evidence-item as-of slice only. It does NOT claim that every EQC operation has historical semantics. Block, transaction, wallet, pool, graph, formation, hypothesis, validation, radar, research, and claim queries remain outside this temporal closure until separately specified.

## Acceptance

CONTRACT → IMPLEMENTATION → TEST → NEGATIVE TEST → RUNTIME VERIFICATION → RECONCILIATION.

Current status remains pending until CI verifies the new implementation.
