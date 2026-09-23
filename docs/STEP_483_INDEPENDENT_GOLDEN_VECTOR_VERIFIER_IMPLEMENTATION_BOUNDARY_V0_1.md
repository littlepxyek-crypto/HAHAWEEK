# STEP 483 — Independent Golden Vector Verifier Implementation Boundary v0.1

Status: IMPLEMENTATION CANDIDATE

## Purpose

Implement the smallest independently auditable verifier for the committed HAHAWEEK V4 checkpoint/cursor/recovery golden-vector artifact.

## Scope

The verifier:

- reads the committed golden-vector document as supplied;
- validates the document and vector schema;
- rejects duplicate vector identities;
- independently canonicalizes JSON into deterministic UTF-8 bytes;
- computes the domain-separated SHA-256 preimage without importing production V4 reference modules;
- compares committed expected hashes where present;
- verifies checkpoint, cursor, and recovery expected outcomes;
- fails closed on malformed structure, invalid domains, canonical/hash mismatch, unsupported vector kinds, duplicate identities, or inconsistent expected results;
- returns deterministic verification results.

## Independence Boundary

The implementation MUST NOT:

- import `src/reference/v4/*`;
- import production ingestion, raw-store, SQLite, cursor, checkpoint, manifest, migration, or runtime state;
- contact RPCs, networks, external APIs, or providers;
- modify golden-vector fixtures;
- establish production V4 authority;
- mutate raw evidence or canonical state.

The canonicalization and hashing logic is intentionally duplicated independently for verification purposes. Agreement with production reference code is an observed verification result, not a dependency.

## Verification

The implementation is considered verified only after repository Security & Regression CI passes on the implementation head.

A later freeze step must record the implementation commit and CI evidence before this boundary is considered VERIFIED / FROZEN.

## Non-goals

- V4 production cutover
- checkpoint/cursor runtime implementation
- migration or lease/fencing
- RPC ingestion
- prediction, ranking, trading, signing, or publication
- automatic rewriting or repair of golden vectors
- closing Design Gate 2 by implication

## Traceability

`Verifier Result → Vector ID → Golden Vector → Domain/Input Object → Canonical UTF-8 Bytes → SHA-256`

## Historical Safety

This step does not replace or rewrite the canonical blueprint, previous project-state entries, golden-vector artifacts, or production evidence.