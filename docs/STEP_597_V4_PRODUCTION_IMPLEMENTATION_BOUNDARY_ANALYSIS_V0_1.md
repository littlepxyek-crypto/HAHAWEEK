# STEP 597 — V4 Production Implementation Boundary Analysis v0.1

- Status: ANALYSIS
- Step: 597
- Baseline: d9f65b342545c33a65164f124d791227f41aa0ba
- Predecessor: STEP 596
- Contract: docs/STEP_597_V4_PRODUCTION_IMPLEMENTATION_BOUNDARY_CONTRACT_V0_1.md
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Inspect the actual repository and determine whether a sufficiently explicit, repository-grounded boundary exists for V4 production integration without inventing authority, cursor, evidence, lineage, generation, recovery, or writer semantics.

This analysis does not activate V4, cut over live RPC, advance/reset the cursor, mutate canonical evidence, alter frozen contracts, or authorize production runtime behavior.

## 2. Repository baseline

The analyzed main baseline is `d9f65b342545c33a65164f124d791227f41aa0ba`.

The baseline contains:
- Gate 2 state PASS in `docs/DESIGN_GATE_2_STATE.md`.
- STEP 597 contract and reconciliation/state finalization.
- V4 engineering verifiers under `src/v4/`.
- V4 reference primitives under `src/reference/v4/`.
- Runtime ingestion under `src/core/ingestion.js` and `src/index.js`.
- Canonical processing context under `src/core/runtime-processing-context.js`.
- Durable F-03 authority persistence under `src/core/f03-authoritative-chain-persistence.js`.
- Authority validation/binding under `src/core/f03-production-authority-record.js`, `src/core/f03-authority-binding.js`, and `src/core/f03-ingestion-authority-integration.js`.
- Existing writer fencing under `src/core/single-writer-fence.js`.
- Existing cursor under `src/core/block-cursor.js`.

## 3. V4 component inventory

The repository's `src/v4/` directory currently contains:
- `f02-reorg-verifier.js`
- `f04-migration-verifier.js`
- `f05-rpc-provenance-verifier.js`

The reference V4 directory currently contains:
- `event-identity.js`
- `hash.js`
- `jcs.js`
- `transition.js`

These are engineering/reference/verification artifacts. Their presence and passing tests do not by themselves establish production authority.

## 4. Runtime entry and exit points

Current runtime entry is `src/index.js`, invoked by the repository scripts `start`/ `scan`; the runner invokes health and the one-shot scan.

The runtime constructs:
1. RPC provider;
2. writer fence;
3. legacy write barrier;
4. database;
5. raw event store;
6. block cursor;
7. raw-log ingestion;
8. verified processing context;
9. F-03 authority gate.

The batch path in `src/core/ingestion.js` calls `processorRange(fromBlock,toBlock)`, then the authority gate, and only after the gate returns does it call the existing `BlockCursor.advance(toBlock)`.

The runtime therefore already exposes a narrow integration seam immediately before the existing cursor barrier. This seam is not itself a V4 production authority implementation.

## 5. Canonical evidence ownership

Canonical processing context is constructed by `createVerifiedProcessingContext`.

Observed repository behavior:
- exact range is validated;
- writer ownership is asserted;
- an outer database snapshot is taken;
- canonical decision input/snapshot is established;
- raw ingestion is performed;
- transition/parent/generation are resolved from persisted canonical lineage;
- canonical lineage is accepted;
- only then is an immutable `VERIFIED` processing context returned;
- if durable lineage has not been established, the outer database snapshot is restored on failure.

The returned context carries status, exact range, processing identity, parent, transition type, generation, canonical evidence IDs, evidence-set digest, lineage ID, provenance, commit time, and canonical decision snapshot ID.

This is a repository-grounded semantic owner. Production V4 integration must consume this output rather than manufacture equivalent fields.

## 6. Processing / lineage / generation ownership

`runtime-processing-context.js` delegates canonical decision input to `canonical-decision-input.js` and lineage acceptance to `runtime-canonical-lineage.js`.

Generation is resolved from persisted lineage:
- INITIAL establishes generation `1`;
- CONTINUATION inherits the accepted parent generation;
- REORG_REPLACEMENT increments the persisted parent generation;
- overflow and ambiguous/missing parent cases fail closed.

No evidence was found authorizing production integration to derive generation from cursor state, timestamps, writer fences, checkpoints, manifests, randomness, or defaults.

Therefore these semantic owners must remain unchanged.

## 7. Authority ownership

The F-03 authority gate is `createAuthorityGate`.

It requires:
- an explicit authority source;
- a distinct expected-authority source;
- authority validation;
- expected binding validation;
- exact range agreement;
- VERIFIED processing context when supplied;
- generation equality between authority and processing context;
- cursor endpoint equality between authority and processing context;
- writer-fence ownership when used.

The expected source is repository-grounded through `createDurableExpectedAuthorityFactory(database)`, which reads the persisted F-03 segment -> manifest -> checkpoint chain.

The durable F-03 reader fails closed when the chain is absent, ambiguous, or inconsistent.

### Critical boundary finding

`src/index.js` intentionally requires an explicit `authorityFactory` for the production authority source. When no factory is supplied, it throws `AUTHORITY_SOURCE_REQUIRED`.

This is a deliberate missing production-authority input, not a missing test fixture to be bypassed.

The repository therefore has:
- a verified processing/lineage context;
- a durable expected-authority reader;
- an authority validator/binding boundary;
- a cursor barrier;

but it does not expose a contract-authorized, repository-grounded production authority source that can be selected as the authoritative `authorityFactory` for live production execution.

## 8. Cursor ownership

`BlockCursor` remains the existing cursor owner.

The batch ingestion path advances it only after:
1. verified processing context creation;
2. authority gate success.

No new cursor semantics are required or authorized by STEP 597 Analysis.

Cursor reset, manual advancement, or alternative cursor authority would violate the standing boundary.

## 9. Writer / fencing ownership

`createWriterFence` remains the single-writer owner.

The runtime acquires the fence before constructing the database and asserts ownership in the processing-context and authority paths.

No second writer or lock mechanism is justified by this analysis.

## 10. Recovery / reorg / crash boundary

Repository evidence establishes:
- processing-context snapshot restoration before durable lineage success;
- preservation of durable results once the durable boundary has been crossed;
- fail-closed lineage parent/generation resolution;
- F-02 offline reorg verification;
- F-03 durable segment/manifest/checkpoint verification;
- existing cursor-after-authority ordering.

However, this analysis does not promote offline verification modules into live production authority.

The production boundary remains incomplete until the authority source and its lifecycle are contractually defined.

## 11. Integrity verification boundary

V4 reference and F-03 authority code provide deterministic hashing/canonicalization, authority binding, checkpoint verification, provenance checks, and chain-link validation.

These are suitable inputs to a future production integration design only where their semantic ownership is already frozen and explicitly wired.

No replacement implementation or duplicated integrity formula is justified.

## 12. Operator Acceptance

The operator boundary remains repository-grounded.

Current repository scripts are:
- `npm test`
- `npm start`
- `npm run scan`
- `npm run health`
- `npm run hahaweek`
- `npm run verify:v4`
- `npm run verify:v4:coverage`

This analysis does not invent new recovery commands.

Operationally, the current production scan cannot be represented as V4-authorized production execution merely because the engineering components exist: the default runtime authority source is intentionally absent and fails closed with `AUTHORITY_SOURCE_REQUIRED`.

The operator STOP condition is therefore preserved: do not bypass the authority boundary or substitute an ad-hoc authority source.

## 13. Surveillance compatibility

Surveillance remains outside production authority.

Any future Surveillance capability must be:
- derived;
- evidence-linked;
- versioned;
- reproducible;
- non-authoritative.

It must not mutate raw/canonical evidence, advance the cursor, grant authority, or perform automated action/trading.

No ADDRESS = ACTOR inference is introduced.

No temporal leakage or unvalidated predictive/ranking authority is introduced.

## 14. Explicit STOP / FAIL-CLOSED conditions

Production integration must STOP/FAIL-CLOSED when any of the following occurs:
- authority source is absent;
- expected authority chain is absent/ambiguous/integrity-conflicted;
- processing context is absent or not VERIFIED;
- range mismatch exists;
- generation mismatch exists;
- authority cursor endpoint differs from processing context;
- writer fence is missing/stale/expired;
- canonical lineage parent/transition/generation cannot be established;
- integrity/provenance verification fails;
- durable persistence cannot be established at the required boundary;
- reorg relationship is ambiguous;
- any proposed implementation requires new semantics not owned by an existing contract.

No fallback/default authority is justified.

## 15. Smallest supportable production boundary

A repository-grounded boundary exists for a future adapter immediately before the unchanged cursor barrier:

`verified processing context -> explicit production authority source -> expected durable authority binding -> existing authority gate -> existing BlockCursor.advance()`

This is an integration seam, not an authorization to activate V4.

The smallest implementable production boundary is therefore conditional on a separate explicit production-authority source contract. Without that contract, the boundary cannot be safely implemented.

## 16. Analysis decision

**BLOCKED FOR PRODUCTION IMPLEMENTATION.**

The repository provides enough evidence to define the integration seam and preserve existing semantic owners, but it does not provide a contract-authorized production authority source for the `authorityFactory` required by the live runtime.

Proceeding directly to Code would require inventing or selecting authority semantics. That violates STEP 597, the frozen authority boundary, and fail-closed requirements.

Therefore:
- no production code change is authorized by this Analysis;
- no V4 activation occurs;
- no cursor/evidence/authority semantics change;
- the next necessary work is a contract that explicitly defines the production authority source and its provenance/lifecycle, followed by Analysis/Design under the standing lifecycle.

## 17. Required next STEP

**STEP 598 — V4 Production Authority Source Contract** should establish, from repository-grounded evidence:
- authoritative source identity and ownership;
- exact production authority record schema already compatible with F-03;
- provenance and lifecycle;
- how/where the source is durably established;
- exact range/generation/cursor binding;
- reorg/replacement behavior;
- recovery/crash semantics;
- writer/fencing ownership;
- STOP/FAIL-CLOSED conditions;
- operator-visible verification;
- Surveillance non-authority boundary.

No implementation should occur until that contract is verified/reconciled and its Analysis/Design authorize a concrete boundary.
