# STEP 589 — Runtime Canonical Lineage / Processing Context Integration Design v0.1

Status: DESIGN
Step: 589
Baseline: 6c01572ad29ab577fe8f2a749516cf961cbd9ee6
V4 production activation: INACTIVE

## 1. Implementation boundary

Introduce one orchestration module:

`src/core/runtime-processing-context.js`

It composes existing owners and does not reimplement their semantics.

Inputs:
- provider;
- database;
- writerFence;
- exact fromBlock/toBlock;
- chainId/confirmations;
- raw log ingestion dependency/filter;
- deterministic provenance.

Output:
the verified processing context defined by STEP 584/588.

## 2. Algorithm

A. Validate exact range and writer ownership.
B. Capture outer database snapshot.
C. Create exact canonical decision snapshot.
D. Ingest raw events for exact range.
E. Determine transition/parent/generation using persisted lineage plus STEP 588 rules.
F. Invoke `acceptCanonicalLineage()`.
G. Reconstruct and verify result/lineage.
H. Return immutable context.
I. Authority gate validates exact context.
J. Cursor advances.

## 3. Transition resolver

Implement a small internal resolver, not a second canonicality owner.

INITIAL:
- no parent;
- transition INITIAL;
- generation "1".

CONTINUATION:
- query accepted lineage ending at fromBlock - 1;
- reconstruct candidates;
- require branch-prefix compatibility with current canonical decision;
- require exactly one candidate;
- inherit parent generation.

REORG_REPLACEMENT:
- query accepted lineage candidates whose decision snapshots overlap the new branch;
- reconstruct candidate/current snapshots;
- establish common ancestor through existing canonical-decision primitive;
- require exactly one replaced parent;
- transition REORG_REPLACEMENT;
- generation = parent generation + 1 under STEP 588.

Ambiguity or conflict is a hard failure.

The resolver must not use cursor or authority.

## 4. Database snapshot semantics

Capture before canonical decision writes.

If failure occurs before durable processing-result success:
- restore snapshot;
- do not call authority;
- do not advance cursor.

If durable result succeeds:
- preserve immutable evidence on downstream failure;
- cursor remains unchanged.

## 5. Authority extension

Change the existing authority gate signature to accept `processingContext`.

Require:
- VERIFIED status;
- exact range;
- generation equality;
- cursorBlock === toBlock;
- existing authority/expected-authority binding.

Return existing validated authority result plus a non-authoritative binding status if needed.

Do not modify F-03 authority record schema.

## 6. IngestionEngine change

Change only the batch success boundary:

`const context = await processorRange(fromBlock,toBlock)`
→ `authorityGate({checkpointCommitted:true, fromBlock,toBlock,blockNumber:toBlock,processingContext:context})`
→ `cursor.advance(toBlock)`.

The authority gate failure must prevent cursor advancement.

## 7. Operator output

Extend runOnce result with projections from the last verified context. Do not persist these projections as new authority.

The output must distinguish VERIFIED, AUTHORIZED, CURSOR ADVANCED, and failure/not-advanced states.

## 8. Test plan

Positive:
- INITIAL generation "1";
- CONTINUATION inherits parent generation;
- REORG generation increments and preserves parent;
- empty result;
- exact range;
- deterministic replay;
- restart after durable result;
- operator projection.

Negative:
- missing/ambiguous parent;
- branch mismatch;
- common ancestor missing;
- generation overflow;
- authority context missing;
- authority range/generation mismatch;
- raw-only success;
- writer-fence loss;
- save failure;
- cursor regression;
- concurrent same-range conflict.

Regression:
- STEP 578/579 golden vectors unchanged;
- schema version remains 7;
- no cursor reset;
- no historical rewrite.

## 9. Security/CI

Required:
`npm test`
`npm run verify:v4`
`npm run verify:v4:coverage`
dependency audit;
tracked-secret detection;
Security/Regression;
CodeQL;
exact PR-head evidence;
exact merge-commit post-merge evidence.

V4 remains INACTIVE.
