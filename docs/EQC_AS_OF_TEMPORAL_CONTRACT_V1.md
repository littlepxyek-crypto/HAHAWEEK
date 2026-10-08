# HAHAWEEK — EQC AS-OF TEMPORAL CONTRACT V1

Status: IMPLEMENTED / VERIFIED — evidence-item as-of slice
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

This contract closes **only the evidence-item canonicality-as-of slice**. It does not mean that the returned evidence payload itself is a complete historical snapshot of what existed at the requested time. Current implementation does not establish historical existence/content semantics for evidence records that may have been stored after the requested time.

Block, transaction, wallet, pool, graph, formation, hypothesis, validation, radar, research, and claim queries do not currently have historical semantics. Supplying an `as_of` value to an operation without an activated temporal contract MUST fail closed with `QUERY_TEMPORAL_NOT_SUPPORTED`; it MUST NOT be silently ignored.

Consumers therefore MUST NOT infer "full as-of system state" from the evidence-item as-of slice alone.


This contract closes the evidence-item as-of slice only. It does NOT claim that every EQC operation has historical semantics. Block, transaction, wallet, pool, graph, formation, hypothesis, validation, radar, research, and claim queries remain outside this temporal closure until separately specified.

## Acceptance

CONTRACT → IMPLEMENTATION → TEST → NEGATIVE TEST → RUNTIME VERIFICATION → RECONCILIATION.


## Verification Reconciliation

The evidence-item as-of implementation is exercised by the EQC test suite. Exact-head CI also verifies the repository test suite, V4 verification/coverage, security/regression, and A9 runtime on the active EQC branch. This contract remains deliberately scoped to evidence-item historical canonicality; broader historical semantics remain out of scope until separately implemented.
