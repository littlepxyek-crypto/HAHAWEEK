# STEP 599 — V4 Production Authority Source Lifecycle Contract v0.1

- Status: CONTRACT
- Step: 599
- Predecessor: STEP 598 — V4 Production Authority Source Analysis State Finalization
- Baseline: `78b8b0202fcaaa5a9f1cbbda82934d93bc5cea2c`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Establish the missing lifecycle boundary for a production authority source identified by STEP 598 Analysis.

This contract defines the semantic ownership and lifecycle requirements that must be satisfied before any production authority source may be designed or implemented.

This contract does not select an implementation, activate V4, change cursor semantics, mutate evidence, migrate data, or authorize live production behavior.

## 2. Repository-grounded starting point

The repository currently provides:

- verified canonical processing context;
- canonical lineage and generation;
- durable F-03 expected-authority chain;
- production-authority record validation;
- cryptographic authority binding;
- existing F-03 authority gate;
- existing single-writer fence;
- unchanged BlockCursor ordering;
- fail-closed recovery/reorg and integrity boundaries.

The runtime intentionally requires an explicit `authorityFactory` and fails closed with `AUTHORITY_SOURCE_REQUIRED` when none is supplied.

The durable expected-authority chain is not automatically a production authority source. This contract SHALL preserve that source distinction.

## 3. Semantic ownership

The production authority source lifecycle SHALL own only:

1. establishment of an explicit production authority record;
2. provenance linking that record to the verified processing context and expected-authority commitment;
3. durable establishment status;
4. immutable lifecycle identity;
5. deterministic reconstruction/reuse after crash;
6. replacement semantics for canonical reorganization;
7. operator-visible source/status verification.

It SHALL NOT take ownership of:

- raw evidence;
- canonical evidence;
- processing-context semantics;
- lineage/generation calculation;
- expected-authority derivation;
- authority validation formula;
- authority binding formula;
- writer/fencing semantics;
- cursor advancement.

No semantic owner may be duplicated or silently moved.

## 4. Production authority record

A production authority record SHALL remain compatible with the existing F-03 authority representation:

- `segmentId`;
- `manifestDigest`;
- `checkpointDigest`;
- `generation`;
- `cursorBlock`;
- `bindingDigest`.

The existing `assertProductionAuthority` and `assertAuthorityBinding` semantics remain authoritative.

Any additional lifecycle metadata required by implementation SHALL be handled by an explicit subsequent contract if it changes the authority record schema or validation semantics.

No silent schema extension is permitted.

## 5. Establishment lifecycle

The lifecycle SHALL distinguish at minimum:

`UNESTABLISHED` → `CANDIDATE` → `DURABLY_ESTABLISHED`

and failure/invalid states SHALL fail closed rather than become authority.

A record may enter `DURABLY_ESTABLISHED` only after:

1. a VERIFIED processing context exists;
2. exact range is bound;
3. generation is bound;
4. cursor endpoint is bound;
5. canonical evidence identity is bound through the existing processing/expected-authority chain;
6. the existing expected-authority commitment is available;
7. the production authority binding digest is valid under the existing binding formula;
8. writer ownership is proven where required;
9. the durable establishment boundary succeeds atomically under the repository's existing durability model.

A transient or partially persisted candidate SHALL never be treated as production authority.

## 6. Provenance

The lifecycle SHALL preserve enough provenance to reconstruct:

- which verified processing context established the record;
- which exact range it covers;
- which generation it belongs to;
- which cursor endpoint it binds;
- which expected-authority segment/manifest/checkpoint it matches;
- which binding digest was validated;
- which durable establishment event committed the record.

Provenance SHALL be evidence-linked and deterministic.

It SHALL NOT be manufactured from timestamps, cursor position alone, writer state, randomness, defaults, or inference.

## 7. Recovery and idempotence

Before durable establishment:

- failure SHALL leave no authoritative production state;
- the existing cursor SHALL remain unchanged;
- historical evidence SHALL remain unchanged.

After durable establishment:

- recovery SHALL reconstruct or reuse the same immutable authority record;
- repeated recovery SHALL not create a conflicting authority identity;
- history SHALL not be rewritten or deleted;
- cursor advancement remains governed exclusively by the existing authority-gated ordering.

If deterministic reconstruction cannot be proven, STOP/FAIL-CLOSED.

## 8. Reorg and replacement

Canonical reorganization SHALL NOT silently overwrite a prior authority record.

The lifecycle SHALL define, before implementation:

- how a replacement authority relates to its predecessor;
- how generation changes are consumed from canonical processing lineage;
- how stale authority is rejected;
- how the previous authority remains auditable;
- how ambiguous reorg state produces STOP/FAIL-CLOSED.

Replacement semantics SHALL use existing canonical lineage/generation ownership and SHALL NOT manufacture generation locally.

## 9. Concurrency and writer authority

The existing single-writer fence remains the sole writer/fencing authority.

The lifecycle SHALL NOT introduce:

- a second lock;
- a second writer;
- a competing concurrency protocol;
- authority creation outside the existing ownership boundary.

Concurrent establishment attempts SHALL either deterministically converge on the same durable result or fail closed.

## 10. Relationship to expected authority

The production authority source SHALL consume the durable expected-authority chain as a verification/binding input, not silently become identical to it.

The lifecycle SHALL preserve two distinguishable roles:

- expected authority: durable expected commitment;
- production authority: explicitly established runtime authority record.

The production authority MUST prove equality to the expected commitment through the existing authority-binding semantics.

No fallback from production authority to expected authority is permitted.

## 11. Operator Acceptance

Before implementation can be accepted, repository-grounded capabilities SHALL allow an operator to determine:

- which production authority source is configured;
- whether its record is candidate or durably established;
- the exact range/generation/cursor endpoint;
- the expected-authority identifiers/digests it binds;
- whether binding/provenance/integrity verification succeeded;
- whether recovery is permitted;
- when STOP/FAIL-CLOSED is mandatory.

No command or procedure is invented by this contract. Concrete procedure must be derived from actual repository capabilities during Analysis and Design.

## 12. Surveillance boundary

Surveillance remains strictly:

**derived, evidence-linked, versioned, reproducible, non-authoritative.**

The lifecycle SHALL NOT:

- consume Surveillance output as authority;
- allow Surveillance to mutate raw/canonical evidence;
- allow Surveillance to advance the cursor;
- create authority;
- perform automated trading/action;
- infer actor identity from address identity.

**ADDRESS != ACTOR.**

Temporal leakage remains prohibited.

## 13. STOP / FAIL-CLOSED

Production authority MUST NOT be established when:

- source identity/ownership is absent;
- processing context is missing or not VERIFIED;
- exact range differs;
- generation differs;
- cursor endpoint differs;
- expected-authority chain is missing/ambiguous;
- authority binding is missing/invalid;
- provenance is incomplete or unverifiable;
- durable establishment is partial or ambiguous;
- writer ownership cannot be proven;
- reorg/replacement state is ambiguous;
- deterministic recovery cannot be proven;
- implementation requires semantics not owned by an explicit contract.

There SHALL be no default/fallback authority, cursor reset, manual cursor advancement, evidence deletion, historical rewrite, or silent normalization.

## 14. Scope exclusions

This contract does not authorize:

- V4 production activation;
- production authority implementation;
- live RPC cutover;
- schema migration;
- cursor reset/advance changes;
- new writer/lock;
- raw/canonical evidence mutation;
- historical rewrite/deletion;
- automated trading/action;
- predictive/ranking authority;
- ADDRESS = ACTOR inference;
- implementation before Analysis and Design.

## 15. Acceptance criteria

STEP 599 Contract is accepted only when:

1. STEP 598 is VERIFIED/RECONCILED;
2. Gate 2 remains PASS;
3. V4 production authority remains INACTIVE/BLOCKED;
4. production authority lifecycle ownership is explicit;
5. existing F-03 authority representation and binding semantics remain unchanged;
6. establishment/durability/provenance lifecycle is explicit;
7. crash/recovery/idempotence semantics are explicit;
8. reorg/replacement semantics are explicit;
9. expected-authority and production-authority roles remain distinct;
10. existing writer/cursor/lineage/generation owners remain unchanged;
11. Operator Acceptance remains repository-grounded;
12. Surveillance remains non-authoritative;
13. no production implementation semantics are invented;
14. contract is merged and post-merge verified;
15. reconciliation and PROJECT_STATE record exact evidence.

## 16. Next lifecycle

After this contract is verified and reconciled:

**STEP 599 Analysis → Design → Code only if Analysis and Design establish a concrete, repository-grounded production authority source.**

If Analysis finds the lifecycle still cannot be implemented without inventing semantics, production authority remains blocked and the next required contract must be documented.

