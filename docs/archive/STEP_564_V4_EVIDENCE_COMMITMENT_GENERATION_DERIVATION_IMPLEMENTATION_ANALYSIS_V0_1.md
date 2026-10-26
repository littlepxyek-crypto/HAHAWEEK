# STEP 564 — V4 Evidence Commitment & Generation Derivation Implementation Analysis v0.1

Status: ANALYSIS
Step: 564
Contract: STEP 563
Gate 2: PASS
V4 production activation: INACTIVE

## Repository inspection

The current repository already contains:
- immutable raw evidence in `raw_events`;
- canonical evidence persistence in `canonical_evidence`;
- complete evidence identity/hash validation in `evidence-repository.js`;
- frozen RFC8785/JCS-compatible canonical UTF-8 implementation at `src/reference/v4/jcs.js`;
- the authoritative F-03 checkpoint derivation `checkpointDigestFor(generation, manifestDigest)`;
- F-03 generation validation (canonical decimal unsigned string, uint64 bounded);
- F-03 authority binding and durable expected-authority validation.

The current repository does not expose a frozen processing-result persistence model carrying generation, canonical-result identity, and canonicality/reorg acceptance as first-class fields. Therefore STEP 564 must not invent those semantics or manufacture generation from cursor/time/fence/expected authority.

## Implementation boundary

This STEP implements the deterministic commitment derivation boundary as a pure, fail-closed module. Its input is an explicitly supplied completed canonical-processing result/context plus persisted canonical-evidence records. It does not read durable expected authority, mutate the cursor, decide generation transitions, or activate V4.

The module verifies:
- exact inclusive range;
- supplied generation format;
- processing-result identity/range/generation consistency;
- accepted canonical-result status;
- explicit empty-result declaration;
- raw-event linkage;
- canonical evidence identity/hash integrity;
- canonical evidence range and complete transaction index;
- deterministic ordering;
- duplicate authority-key rejection;
- reorg/invalid canonicality rejection.

It then derives leaf hashes, segment identity/digest, manifest identity/digest, and the existing F-03 checkpoint digest.

## Non-goals

- no cursor advancement;
- no F-03 durable writes;
- no submitted/expected authority comparison;
- no V4 production activation;
- no generation invention;
- no historical evidence rewrite/deletion;
- no SQLite schema migration.

If runtime integration later lacks a persisted processing-result context, that is a separate contract/design boundary and must not be hidden inside this derivation module.
