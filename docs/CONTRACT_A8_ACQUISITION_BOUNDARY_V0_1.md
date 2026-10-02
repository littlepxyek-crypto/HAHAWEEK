# HAHAWEEK — A8 Acquisition Boundary Contract v0.1

## Status

IMPLEMENTATION CANDIDATE — bounded foundation only.

## Authority

This change applies the explicitly requested architectural patterns from Agent-Reach, Scrapling, and Patchright while preserving A7 Evidence Authority.

## Objective

Introduce a backend-independent acquisition boundary so external observation can later be connected to HAHAWEEK without allowing acquisition tools to define truth.

## Allowed

- acquisition metadata contracts;
- source registry and capability declaration;
- source health state;
- explicit acquisition result validation;
- deterministic content hashing;
- provenance capture;
- fail-closed unavailable/degraded states;
- unit tests for the boundary.

## Not allowed

- production network acquisition;
- autonomous crawling;
- stealth/bypass as a system objective;
- proxy rotation;
- credential collection;
- external publication;
- mutation of raw/canonical evidence;
- cursor advancement;
- actor identification/deanonymization;
- trading/signing/transactions;
- LLM authority over evidence;
- automatic promotion of acquisition output to canonical evidence.

## Required invariants

1. Acquisition is observation, not truth.
2. Every acquisition has an explicit source and backend.
3. Unavailable/degraded is preserved; it is never converted to success.
4. Content hash covers the observed content supplied to the boundary.
5. Provenance is additive and immutable after result creation.
6. The acquisition boundary cannot mutate Evidence Authority.
7. Backend implementations remain replaceable.
8. No external action is performed by this layer.

## Lifecycle

SOURCE_DECLARED → PROBING → AVAILABLE/DEGRADED/FAILED → ACQUISITION → OBSERVED/UNAVAILABLE → downstream evidence boundary.

## Acceptance

The foundation is acceptable only if tests prove schema validation, fail-closed status handling, content hashing, source capability checks, and mutation isolation.

A8 backend activation remains a separate authorization boundary.
