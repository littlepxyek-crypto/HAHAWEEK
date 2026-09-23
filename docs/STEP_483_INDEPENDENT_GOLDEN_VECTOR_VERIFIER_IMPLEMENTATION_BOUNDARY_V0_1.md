# STEP 483 — Independent Golden Vector Verifier Implementation Boundary v0.1

Status: VERIFIED / FROZEN

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

## Verification Record

Implementation PR: #184  
Implementation merge commit: `fb1abed86f85a9275e02b2ee7cf5951c75ca2205`  
Implementation head: `2948f4a88d7b9dc02fd65bd719b2eb206fe41d4a`  
Security & Regression pre-merge #1582: PASS  
Security & Regression PR verification #1583: PASS  
CodeQL PR #637: PASS  
Post-merge Security & Regression #1584: PASS  
Post-merge CodeQL / Push on main #638: PASS  
Freeze branch: `step-483-freeze-2026-09-23`

The implementation is VERIFIED / FROZEN after the recorded implementation and post-merge verification gates passed.

## Freeze Boundary

This freeze records the independently auditable verifier implementation exactly as merged. No additional semantic implementation changes are permitted under STEP 483. Any further implementation change requires a new explicitly scoped step.

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