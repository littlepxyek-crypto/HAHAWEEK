# STEP 562 — V4 Submitted Authority Producer Implementation Analysis Finding v0.1

Status: BLOCKED / ANALYSIS
Step: 562
Precondition: STEP 561 VERIFIED / FROZEN
V4 production activation: INACTIVE

## 1. Repository inspection

The implementation boundary was inspected against the actual `main` state.

Existing executable primitives include:

- `IngestionEngine` exact batch range processing;
- durable raw event persistence;
- F-03 segment/manifest/checkpoint schema and persistence;
- durable expected-authority reader;
- production-authority structural validation;
- cryptographic authority binding;
- writer fencing;
- cursor advancement after the authority gate.

The current production wiring still deliberately fails closed when no submitted authority producer is injected:

`AUTHORITY_SOURCE_REQUIRED`.

## 2. STEP 561 contract check

STEP 561 requires the submitted producer to consume completed evidence and independently produce:

- segment identity;
- segment digest;
- manifest identity/digest;
- checkpoint digest;
- generation;
- cursor boundary;
- binding digest;
- provenance.

The producer must remain independent from the durable expected-authority reader.

## 3. Implementation boundary gap

The repository does NOT currently define an authoritative derivation contract for two required semantic inputs:

### 3.1 Segment/manifest commitment derivation

The existing persistence layer validates supplied `segmentDigest` and `manifestDigest`, but does not define how production processing derives those commitments from canonical processed evidence.

No verified production function currently specifies:

- canonical evidence set for an exact ingestion range;
- canonical ordering;
- segment digest input;
- manifest digest input;
- stable segment/manifest identity derivation;
- provenance-to-commitment linkage.

Manufacturing these values inside STEP 562 would create new cryptographic semantics without a reviewed contract.

### 3.2 Generation authority

The existing F-03 schema validates generation syntax and chain equality, but the repository does not define the authoritative production rule for selecting or advancing generation for a newly processed range.

Choosing a generation such as a constant, current cursor, timestamp, range-derived value, or arbitrary increment would invent authority semantics.

This is especially unsafe for recovery/reorg behavior because generation is explicitly part of the authority commitment.

## 4. Rejected implementation shortcuts

The following were not implemented:

- copying values from durable expected authority;
- using `readF03AuthorityChain()` as submitted producer input;
- manufacturing segment/manifest digests from arbitrary metadata;
- assigning a constant generation;
- deriving generation from cursor state without a contract;
- using timestamps as authority generation;
- bypassing cryptographic binding;
- weakening `AUTHORITY_SOURCE_REQUIRED`;
- activating V4 implicitly.

## 5. Why production code is not changed

STEP 561 explicitly requires source separation and deterministic authority semantics.

Without a frozen derivation contract for commitment construction and generation authority, production code cannot be written without inventing security-sensitive semantics.

Changing production code merely to satisfy the existing tests would violate the standing execution rule.

## 6. Required next contract

The repository requires a narrowly scoped contract defining the authoritative derivation of:

1. canonical processed evidence for an exact range;
2. segment identity and segment digest;
3. manifest identity and manifest digest;
4. generation source and transition rules;
5. reorg/generation behavior;
6. deterministic replay vectors;
7. provenance linkage;
8. independence from the durable expected-authority reader.

This is the minimum missing semantic needed before STEP 562 implementation can safely proceed.

## 7. Status

STEP 562 cannot honestly be marked IMPLEMENTED, VERIFIED, FROZEN, or COMPLETE.

No production code, schema, cursor, historical evidence, RPC behavior, or V4 activation was changed.

## 8. Next STEP

STEP 563 — V4 Evidence Commitment & Generation Derivation Contract.

The next step is intentionally a contract step because the repository-grounded production semantics are not currently frozen.
