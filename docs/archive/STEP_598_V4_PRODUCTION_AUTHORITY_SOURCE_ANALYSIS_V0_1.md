# STEP 598 — V4 Production Authority Source Analysis v0.1

- Status: ANALYSIS
- Step: 598
- Predecessor: STEP 598 — V4 Production Authority Source Contract
- Baseline: `0c14fe2d888db65c133c45f85ae117e3d63552ef`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Objective

Determine from the actual repository whether the production authority source required by the STEP 598 Contract can be established without inventing semantics, duplicating an existing semantic owner, changing frozen authority/cursor behavior, or mutating historical evidence.

## 2. Repository inspection

The inspected runtime and authority boundary are:

- `src/index.js`
- `src/core/ingestion.js`
- `src/core/f03-ingestion-authority-integration.js`
- `src/core/f03-production-authority-record.js`
- `src/core/f03-authority-binding.js`
- `src/core/f03-authoritative-chain-persistence.js`
- `src/core/database.js`
- `tests/f03-authority-binding.test.js`
- `PROJECT_STATE.md`

The repository database schema is version 7 and contains the durable F-03 tables:

- `f03_segments`
- `f03_manifests`
- `f03_checkpoints`

The existing F-03 persistence layer validates and durably links segment → manifest → checkpoint, including range, generation, provenance, integrity digests, and checkpoint derivation.

## 3. Existing production authority boundary

`src/index.js` constructs the authority gate with:

1. an explicit `authorityFactory`;
2. a durable expected-authority factory backed by `readF03AuthorityChain()`;
3. `assertProductionAuthority`;
4. `assertAuthorityBinding`;
5. the existing `writerFence`.

When no explicit authority factory is supplied, the runtime intentionally fails closed with:

`AUTHORITY_SOURCE_REQUIRED`

This behavior is repository-grounded and must not be replaced by a default or fallback authority source.

## 4. Existing expected-authority source

`createDurableExpectedAuthorityFactory(database)` reads the exact requested range from the persisted F-03 chain.

`readF03AuthorityChain()` requires exactly one segment, one linked manifest, and one linked checkpoint for the requested range and rejects missing or ambiguous chains.

The returned verified expected authority contains:

- status;
- exact range;
- segment identity;
- manifest identity/digest;
- checkpoint digest;
- generation;
- cursor endpoint.

The chain is therefore a durable expected-authority source, not automatically a production authority source.

## 5. Existing authority representation

`assertProductionAuthority()` requires:

- `segmentId`;
- `manifestDigest`;
- `checkpointDigest`;
- `generation`;
- `cursorBlock`.

`assertAuthorityBinding()` additionally requires a cryptographic `bindingDigest` and proves equality against the expected authority commitment.

The binding commitment is explicitly:

`segmentId + manifestDigest + checkpointDigest + generation + cursorBlock`

with the existing domain-separated SHA-256 binding formula.

The durable F-03 expected-authority reader does not itself return `bindingDigest`. Therefore it cannot simply be reused as the production authority record without introducing a new production-source construction semantic.

## 6. Existing authority gate

`createAuthorityGate()` requires the authority factory and expected-authority factory to be distinct function references.

For each exact range it:

1. proves writer ownership;
2. requires checkpoint commitment;
3. requires VERIFIED processing context when supplied;
4. obtains authority and expected authority;
5. requires exact range equality;
6. validates the authority;
7. validates authority binding against expected authority;
8. requires generation equality with processing context;
9. requires cursor endpoint equality with processing context;
10. reasserts writer ownership.

Only after this gate succeeds does `IngestionEngine` call the unchanged `BlockCursor.advance(toBlock)`.

## 7. Missing semantic boundary

The repository does not currently define a contract-authorized production authority source that is independent from the existing expected-authority chain while also defining:

- source identity and ownership;
- authority-record establishment lifecycle;
- when the production authority record becomes durable;
- provenance of that authority record;
- how its `bindingDigest` is established and persisted;
- relationship between production authority and expected authority;
- reorg/replacement authority lifecycle;
- crash/recovery reconstruction of production authority;
- operator-visible verification of the configured production source.

The existing F-03 chain is authoritative for expected commitments, but promoting it directly to production authority would collapse the required source distinction and invent ownership/lifecycle semantics.

## 8. Integration seam

The smallest repository-grounded seam remains:

`VERIFIED processing context`
→ `explicit production authority source`
→ `durable expected-authority binding`
→ `existing F-03 authority gate`
→ `existing BlockCursor.advance()`

No existing semantic owner should be moved across this boundary.

## 9. Operator Acceptance

Current repository-grounded operator commands remain those already established by prior steps.

This analysis does not add a command or recovery procedure.

A production authority source cannot yet be considered reproducibly operable because the repository has no explicit configured source whose lifecycle, durability, provenance, and verification semantics are defined.

Therefore Operator Acceptance for production authority is **BLOCKED**, not failed.

## 10. Surveillance

No Surveillance implementation is required by this analysis.

Surveillance remains:

- derived;
- evidence-linked;
- versioned;
- reproducible;
- non-authoritative.

It cannot create or supply production authority, mutate canonical/raw evidence, advance the cursor, perform automated action/trading, or infer actor identity from address identity.

**ADDRESS != ACTOR.**

No temporal leakage or predictive/ranking authority is introduced.

## 11. Security / fail-closed findings

The existing fail-closed boundary is preserved.

Production authority must remain blocked when:

- explicit authority source is absent;
- expected chain is missing or ambiguous;
- authority binding is missing or invalid;
- range/generation/cursor binding conflicts;
- processing context is absent or not VERIFIED;
- writer ownership cannot be proven;
- integrity/provenance cannot be verified;
- reorg/replacement semantics are undefined;
- deterministic recovery cannot be established.

No default authority, fallback authority, cursor reset, evidence deletion, historical rewrite, or new writer/lock is justified.

## 12. Decision

**BLOCKED FOR PRODUCTION AUTHORITY IMPLEMENTATION.**

The repository provides a strong integration seam and a verified expected-authority chain, but it does not yet provide a contract-authorized production authority source with explicit ownership, durability, provenance, lifecycle, and recovery semantics.

Implementing one now would require inventing semantics prohibited by the STEP 598 Contract.

## 13. Required next step

The next required boundary is a new explicit contract for the missing production authority source lifecycle, unless an existing repository contract is identified that already owns those semantics.

Recommended lifecycle:

**STEP 598 Analysis → Production Authority Source Lifecycle Contract → Analysis → Design → Code only if the source becomes concrete and repository-grounded.**

No production implementation is authorized by this analysis.

## 14. Preservation

This analysis introduces no production semantic change and preserves:

- historical evidence;
- frozen contracts;
- golden vectors;
- existing F-03 persistence;
- existing authority binding;
- existing processing context;
- generation/lineage;
- writer fence;
- cursor ordering;
- recovery/reorg boundaries;
- Operator Acceptance boundary;
- Surveillance boundary.

V4 production authority remains INACTIVE / BLOCKED.
