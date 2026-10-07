# Problem Record — P1-REFERENCE-INDEPENDENCE-001

ID: P1-REFERENCE-INDEPENDENCE-001
Severity: P1 — HIGH
Status: RESOLVED
Discovered At: 2026-10-07
Location: src/reference/gateway.js — Reference Observation independence boundary

## Symptom

A provider result could supply its own `independence_class`, and the gateway would propagate that value into the Reference Observation.

## Immediate Cause

The gateway selected `result.independence_class` before the registered adapter classification.

## Root Cause

Source independence is a HAHAWEEK analytical boundary, but the first implementation treated a provider-declared classification as equivalent to an adapter-controlled classification.

## Architectural Impact

Without correction, a provider could self-promote an observation to I3/I4 and become eligible for corroboration/analytical relevance despite insufficient HAHAWEEK-controlled independence evidence.

This does not modify V4 authority, canonical evidence, cursor, checkpoint, manifest, or writer-fence state.

## Corrective Action

The gateway now derives `independence_class` only from the registered provider adapter configuration. If the adapter does not explicitly classify the source, the observation defaults to I0 UNKNOWN.

The provider-declared classification is preserved only as provenance metadata and cannot promote the observation.

## Verification

Added an executable negative vector proving:
- provider-declared I4 remains I0 when the adapter has no classification;
- an explicitly adapter-classified I3 remains I3 even if the provider declares I0.

## Regression Test

tests/reference-intelligence-contract-v1.test.js:
`provider cannot self-promote source independence beyond adapter classification`.

## Residual Risk

Live provider lineage and independence mappings remain deferred. External providers must receive explicit adapter-level classification based on documented lineage before they can satisfy I3/I4 requirements.
