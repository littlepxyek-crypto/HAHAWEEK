# STEP 560 — V4 Production Implementation Analysis & Boundary Finding v0.1

Status: ANALYSIS / BLOCKED
Step: 560
Precondition: STEP 559 VERIFIED / FROZEN
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Repository-grounded finding

Current `main` already contains the reviewed V4 authority validation path:

- `createAuthorityGate` requires a distinct submitted authority and durable expected-authority source.
- `createDurableExpectedAuthorityFactory(database)` resolves the expected commitment from persisted F-03 segment → manifest → checkpoint state.
- `assertProductionAuthority` and `assertAuthorityBinding` enforce structural and cryptographic binding.
- `IngestionEngine` invokes the authority gate immediately before cursor advancement.
- STEP 558 provides executable evidence that the durable expected source is wired and fails closed when absent.

However, the live `createEngine()` path has no repository-defined producer for the **submitted/live authority**.

Current behavior is explicit fail-closed:
`authorityFactory` defaults to a function throwing `AUTHORITY_SOURCE_REQUIRED`.

The repository contains no verified contract or implementation establishing how a live processed range produces the candidate authority record that must be independently compared with the durable expected authority.

## 2. Why this blocks STEP 560 implementation

The submitted authority and durable expected authority are intentionally separate roles.

The following alternatives are prohibited:

1. Deriving submitted authority from `readF03AuthorityChain()` — this collapses the two authority sources and violates source separation.
2. Manufacturing submitted authority from `fromBlock`/`toBlock` alone — this creates an authority commitment without an authoritative producer.
3. Reconstructing or normalizing a missing authority record — prohibited by F-03 fail-closed rules.
4. Bypassing `createAuthorityGate` — would weaken the frozen cursor/authority boundary.
5. Adding an implicit runtime source without a reviewed contract — violates traceability and frozen-boundary rules.

## 3. Required next boundary

Before production implementation can safely continue, a dedicated contract must define the authoritative **submitted/live authority producer**.

That contract must specify at minimum:

- producer ownership and input boundary;
- exact processed-range identity;
- segment/manifest/checkpoint commitment generation;
- generation semantics;
- cursorBlock semantics;
- bindingDigest generation;
- provenance;
- persistence ordering;
- relationship to the already durable F-03 expected source;
- reorg/recovery behavior;
- concurrency/writer-fence behavior;
- fail-closed behavior;
- deterministic replay;
- nonmutation guarantees;
- activation semantics.

The producer MUST NOT obtain its expected commitment by calling the durable expected-authority reader as a substitute for an independently produced candidate.

## 4. Current production safety

The existing fail-closed `AUTHORITY_SOURCE_REQUIRED` behavior is preserved.

No production code is changed by this finding.

V4 production remains INACTIVE.

No cursor reset, historical rewrite/deletion, silent normalization/replacement, RPC/provider change, or schema migration is authorized by this finding.

## 5. Acceptance disposition

STEP 560 cannot honestly be marked VERIFIED/FROZEN/COMPLETE until the submitted/live authority producer contract exists and its implementation satisfies the STEP 559 acceptance boundary.

This is a repository-grounded blocker, not a test failure.

## 6. Proposed next STEP

STEP 561 — V4 Submitted Authority Producer Contract.

Reason for advancing the step number: STEP 560's implementation prerequisite is absent from the frozen contract set; creating an explicit producer contract is required rather than inventing production semantics inside STEP 560.

