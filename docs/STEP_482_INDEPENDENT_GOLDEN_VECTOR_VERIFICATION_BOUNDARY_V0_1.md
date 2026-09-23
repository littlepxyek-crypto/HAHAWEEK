# STEP 482 — Independent Golden Vector Verification Boundary v0.1

Status: IMPLEMENTATION CANDIDATE

## Purpose

Define the smallest auditable boundary for an independent offline verifier over the committed HAHAWEEK V4 golden-vector artifacts.

This step advances the existing Design Gate 2 sequence from canonical reference/golden-vector work toward independent offline verification.

## Scope

The verifier may:

- read deterministic golden-vector JSON artifacts committed under `docs/golden-vectors/`;
- validate fixture structure and exact vector keys;
- independently canonicalize the supplied JSON input using an implementation that does not import production V4 reference modules;
- compute domain-separated SHA-256 from the canonical bytes;
- compare canonical UTF-8 bytes and expected hashes;
- fail closed on malformed vectors, duplicate identities, canonical-byte mismatch, or hash mismatch;
- operate entirely offline from supplied repository artifacts.

## Authority and independence

The verifier is an audit tool only.

It MUST NOT:

- import `src/reference/v4/*`;
- import production ingestion, raw-store, SQLite, cursor, migration, or runtime state;
- modify production evidence or state;
- contact an RPC provider, external API, or network service;
- establish V4 production authority;
- change canonical evidence, manifests, checkpoints, cursors, or migration state.

The committed golden vectors remain reference artifacts. The verifier does not regenerate or rewrite them.

## Fail-closed requirements

Verification MUST fail when:

- the vector wrapper is malformed;
- a vector has missing or unknown keys;
- vector identifiers are duplicated;
- a domain is malformed;
- the input object is not valid JSON data;
- canonical bytes differ from the committed `canonical_utf8_hex`;
- the computed digest differs from `expected_hash`;
- the verifier cannot establish deterministic verification.

## Traceability

`Verifier Result → Vector ID → Golden Vector → Domain/Input Object → Canonical Bytes → SHA-256`

## Explicit non-goals

This step does not:

- pass Design Gate 2;
- authorize production V4 cutover;
- implement production checkpoint/cursor handling;
- implement migration;
- implement lease/fencing;
- implement crash recovery;
- modify raw evidence;
- introduce predictive scoring, ranking, trading, signing, or publication side effects.

## Verification gate

Implementation is eligible for merge only after the repository Security & Regression workflow passes.

The boundary becomes VERIFIED/FROZEN only through a subsequent freeze step with recorded CI evidence.
