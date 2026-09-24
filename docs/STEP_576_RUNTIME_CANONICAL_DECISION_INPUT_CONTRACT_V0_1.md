# STEP 576 — Runtime Canonical Decision Input Contract v0.1

Status: CONTRACT
Step: 576
Predecessor: STEP 575
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the missing runtime canonical-decision input identified by STEP 575 so that subsequent runtime canonical-lineage implementation does not invent canonicality semantics.

This contract defines the repository-approved canonical decision input as **canonical block-header chain evidence acquired from the configured RPC provider at a confirmation-safe head**, with explicit parent linkage, exact block identity, immutable persistence, replay verification, and fail-closed conflict handling.

This contract does not itself implement runtime lineage, transition persistence, generation, processing identities, STEP 568 persistence, cursor advancement, or V4 production activation.

## 2. Repository-grounded baseline

At the STEP 576 starting commit `5ef01879cb201351bc36fc5b1a0441179b32a936`:

- `src/core/rpc.js` creates the configured ethers JSON-RPC provider and validates chain ID.
- `src/core/ingestion.js` computes a confirmation-safe head from latest block and configured confirmations.
- `RawLogIngestion` acquires logs but does not establish canonical block lineage.
- raw events may preserve block hash and transaction index, but those fields alone do not establish the accepted block branch.
- no durable runtime block-header/canonical-branch relation exists.
- STEP 573 requires an explicit runtime canonical-lineage owner and forbids RPC log presence alone from establishing canonicality.
- STEP 575 established that a dedicated canonical-decision input contract is required.

## 3. Canonical decision input

The canonical decision input is a **Canonical Block Decision Record (CBDR)** for each block in an exact inclusive range.

Each CBDR SHALL contain at minimum:

- `chain_id`;
- `block_number`;
- `block_hash`;
- `parent_block_hash`;
- `decision_head_block`;
- `confirmation_depth`;
- `source_id`;
- `acquired_at`;
- a deterministic record digest.

The semantic identity of a CBDR is:

`chain_id + block_number + block_hash`.

The parent relation is:

`block_number > 0 => parent_block_hash = canonical block hash at block_number - 1`.

No block header may be treated as canonical merely because an event/log query returned it.

## 4. Source authority boundary

The configured RPC provider is the **acquisition source** for the canonical decision input.

The runtime owner SHALL obtain block-header information through block-oriented RPC methods, not infer canonicality from event/log presence.

The provider source is authoritative only for the explicit decision snapshot represented by the CBDRs. The contract does not claim that a single RPC endpoint is an absolute consensus oracle.

Therefore:

- a provider response is not sufficient by itself;
- the returned header identity MUST be complete;
- contiguous parent linkage MUST verify;
- chain ID MUST match configured chain ID;
- the range MUST be at or below the confirmation-safe decision head;
- conflicting observations MUST fail closed.

A later chain reorganization is represented by a new decision snapshot and lineage transition; it MUST NOT rewrite the historical CBDR.

## 5. Decision-head semantics

For an observed latest block `latestBlock` and configured confirmation depth `confirmations`:

`decisionHead = latestBlock - confirmations`.

The decision head MUST be non-negative.

A requested range `[fromBlock,toBlock]` is eligible for canonical decision only when:

`0 <= fromBlock <= toBlock <= decisionHead`.

The runtime canonical owner MUST NOT silently clamp, truncate, or shift the requested range.

If the range exceeds the decision head, canonical acceptance MUST fail closed.

The existing confirmation calculation remains the upstream acquisition boundary; STEP 576 does not change its formula.

## 6. Required header verification

For every block in the exact range, the runtime canonical decision input MUST verify:

1. block number equals the requested block number;
2. block hash exists and is a canonical 32-byte hexadecimal hash;
3. chain ID matches configured chain ID;
4. for every block after the first:
   `current.parent_block_hash === previous.block_hash`;
5. the first block's parent relationship is deterministically established from the persisted adjacent header when required;
6. the decision head used for acceptance is persisted as provenance;
7. no duplicate block identity exists for the same decision snapshot;
8. no conflicting block hash is silently replaced.

Missing, malformed, contradictory, or incomplete header data MUST fail closed.

## 7. Historical branch preservation

A CBDR is immutable evidence of the canonical branch observed at its decision snapshot.

If a later decision observes:

`block N: hash A`

and a subsequent decision observes:

`block N: hash B`

where `A != B`, both observations MUST remain historically auditable.

The runtime implementation MUST NOT:

- UPDATE the old CBDR into the new hash;
- DELETE the old CBDR;
- silently replace evidence;
- collapse competing observations;
- overwrite provenance.

The canonical lineage layer will later represent the branch change through the STEP 573 transition model.

## 8. Reorg decision boundary

STEP 576 establishes the input required to detect a canonical branch replacement; it does not itself define the processing-result replacement decision.

A reorg candidate exists when a newly acquired CBDR conflicts with a previously accepted block identity at the same block number.

The runtime lineage implementation MUST then:

- preserve both historical block observations;
- determine the common ancestor from persisted header evidence;
- establish the replacement canonical range from explicit header evidence;
- feed the result into STEP 573 canonical transition semantics.

A reorg MUST NOT be inferred solely from changed log membership.

If the common ancestor or replacement branch cannot be determined from preserved evidence, processing MUST fail closed.

## 9. Persistence

Canonical decision input MUST be durably persisted before it is used as authority-eligible canonical evidence.

Persistence MUST be append-only.

The persistence layer MUST support:

- exact-range reconstruction;
- lookup by `chain_id + block_number + block_hash`;
- detection of conflicting block identities;
- deterministic replay;
- restart recovery;
- historical branch preservation.

The schema migration required for this persistence is implementation scope for the next design/code stage and MUST be additive.

Existing raw events, canonical evidence, F-03 records, processing results, and historical artifacts MUST remain unchanged.

## 10. Decision snapshot identity

The decision snapshot MUST have deterministic identity over:

- contract identifier;
- chain ID;
- exact inclusive range;
- decision head;
- ordered CBDR block identities;
- confirmation depth;
- source identity.

The identity MUST use canonical serialization and domain-separated SHA-256.

The exact byte-level formula and golden vectors SHALL be frozen during the implementation contract/design stage before production code.

No timestamp, writer-fence value, randomness, cursor value, or hash truncation may influence semantic decision identity.

`acquired_at` is provenance only and MUST NOT influence semantic identity.

## 11. Replay and recovery

For identical persisted CBDRs and identical exact range:

- decision result MUST be deterministic;
- block ordering MUST be deterministic;
- branch identity MUST be deterministic;
- snapshot identity MUST be deterministic;
- replay MUST not create a different semantic decision.

A restart MUST recover from persisted CBDRs.

A missing or corrupted CBDR MUST fail closed rather than being regenerated silently from a different source.

If a source response differs from an already committed decision snapshot for the same semantic identity, the conflict MUST be recorded and rejected rather than normalized.

## 12. Concurrency and writer fence

Canonical decision acquisition and persistence MUST execute under the existing single-writer fence.

The writer fence MUST be asserted before:

- canonical decision persistence;
- canonical decision admission;
- downstream lineage commitment.

Loss of writer ownership MUST fail closed.

The writer-fence token is operational metadata only and MUST NOT participate in canonical decision identity or generation.

## 13. Independence boundaries

The canonical decision input MUST NOT use any of the following as a substitute for block-header canonicality:

- cursor state;
- expected F-03 authority;
- submitted authority output;
- F-03 checkpoint digest;
- F-03 manifest digest;
- writer-fence value;
- wall-clock time;
- default generation;
- arbitrary hash truncation;
- log presence alone.

Expected authority remains an independent verification layer.

STEP 576 does not redefine F-03 authority semantics.

## 14. Relationship to evidence

A raw event may reference a block hash.

That relationship becomes eligible for canonical processing only when the referenced block hash is supported by the accepted CBDR for the relevant decision snapshot.

Canonical evidence construction remains responsible for evidence identity/hash integrity.

STEP 576 does not alter the STEP 573 F-02 transition states:

- `OBSERVED`;
- `CANONICAL`;
- `ORPHANED`.

It only supplies the upstream block-branch decision input required by the lineage owner.

## 15. Empty-result semantics

An exact range with a verified canonical block-header chain but zero admitted canonical event evidence is a valid **empty canonical result**.

An exact range with missing/ambiguous canonical block decision input is **not** an empty result.

The distinction MUST remain explicit for STEP 568.

## 16. Fail-closed conditions

Canonical decision MUST fail closed on:

- missing block header;
- malformed block hash;
- malformed parent hash;
- chain-ID mismatch;
- block-number mismatch;
- broken parent linkage;
- conflicting persisted block identity;
- duplicate contradictory CBDR;
- range outside decision head;
- incomplete historical branch evidence;
- corrupted persisted CBDR;
- nondeterministic replay;
- lost writer ownership;
- persistence failure;
- ambiguous replacement branch;
- missing common ancestor when required for reorg determination.

No fallback to another forbidden authority source is permitted.

## 17. Security and integrity requirements

The implementation MUST test adversarially:

- wrong block number;
- wrong chain ID;
- malformed block hash;
- malformed parent hash;
- broken parent linkage;
- duplicate block identity;
- conflicting block hash;
- replay after restart;
- historical branch preservation;
- reorg/common-ancestor reconstruction;
- range above safe decision head;
- concurrent writer loss;
- persistence failure;
- source inconsistency.

No test may weaken production semantics merely to obtain green CI.

## 18. Golden vectors

Before implementation completion, deterministic golden vectors MUST cover at least:

1. one-block canonical decision;
2. contiguous multi-block chain;
3. exact decision-head boundary;
4. range-above-head rejection;
5. parent-link mismatch;
6. block-hash conflict;
7. identical replay;
8. competing branch preservation;
9. deterministic reorg replacement input;
10. corrupted/missing CBDR recovery failure.

The vectors MUST preserve exact serialized inputs and expected hashes/results.

## 19. Scope exclusions

STEP 576 does not:

- implement the runtime lineage owner;
- implement transition-history schema;
- implement generation assignment;
- implement processing-result identities;
- modify STEP 563;
- modify STEP 568;
- advance or reset the cursor;
- change F-03 expected authority;
- activate V4 production;
- introduce trading, prediction, ranking, or publication behavior;
- connect HAHAWEEK to another project.

## 20. Acceptance criteria

1. A repository-approved canonical-decision input is explicitly defined.
2. The source is block-header canonical-chain evidence, not RPC log presence.
3. Exact-range and confirmation-safe decision-head semantics are frozen.
4. Parent linkage and block identity validation are frozen.
5. Historical branch observations are immutable and preserved.
6. Reorg input semantics are explicit without prematurely redefining STEP 573 transitions.
7. Persistence and reconstruction requirements are frozen.
8. Snapshot identity requirements are deterministic and domain-separated.
9. Replay/recovery behavior is fail-closed.
10. Writer-fence requirements are explicit.
11. Independence from cursor/expected authority/F-03 digests is explicit.
12. Empty canonical result is distinguished from missing canonical decision.
13. Adversarial and golden-vector requirements are explicit.
14. STEP 563 and STEP 568 remain unchanged.
15. V4 production activation remains INACTIVE.
16. Next implementation/design stage is identified.

## 21. Traceability

Requirement → STEP 576 contract → implementation design → canonical-decision persistence code → tests/golden vectors → Security/Regression → CI → review → merge → post-merge verification → reconciliation → runtime lineage integration.

## 22. Next STEP

**STEP 577 — Runtime Canonical Decision Input Implementation Design & Analysis.**

STEP 577 MUST translate this frozen contract into the smallest repository-compatible persistence/API design before production code changes.
