# STEP 589 — Runtime Canonical Lineage / Processing Context Integration Analysis v0.1

Status: ANALYSIS
Step: 589
Baseline: 6c01572ad29ab577fe8f2a749516cf961cbd9ee6
V4 production activation: INACTIVE

## 1. Result

STEP 588 removes the prior generation blocker. The repository now has a contract-approved deterministic generation rule:

- INITIAL/no parent → "1";
- CONTINUATION → parent generation;
- REORG_REPLACEMENT → parent generation + 1, uint64 checked.

The remaining implementation problem is parent-selection orchestration and the authority/cursor barrier. No new semantic owner is required.

## 2. Current runtime facts

`src/index.js` still returns raw-ingestion counters from `processorRange` after `database.save()`.

`src/core/ingestion.js` treats successful `processorRange` as sufficient to call authority and then advances the cursor.

`src/core/canonical-decision-input.js` produces a verified exact-range snapshot with immutable CBDRs and exposes persisted reconstruction/common-ancestor primitives.

`src/core/runtime-canonical-lineage.js` consumes that snapshot but currently requires callers to supply transitionType, parentResultId, and generation.

`src/core/processing-result-persistence.js` reconstructs and verifies immutable result/evidence membership.

`src/core/f03-ingestion-authority-integration.js` currently validates only authority/expected authority and exact range; it does not yet consume the processing context.

## 3. Parent-selection analysis

### CONTINUATION

Candidate parents are persisted `canonical_lineage` rows whose `toBlock === fromBlock - 1`.

For each candidate:
1. reconstruct the lineage;
2. read its processing-result provenance to recover the canonical decision snapshot ID;
3. reconstruct that snapshot;
4. compare the candidate snapshot's terminal block hash with the current snapshot's first block parent hash;
5. require the candidate to be a valid accepted lineage and generation source.

If zero candidates match: fail closed.
If multiple distinct accepted result identities match: fail closed as ambiguous.
If exactly one matches: parentResultId and generation come from that persisted lineage.

No cursor or authority state participates.

### REORG_REPLACEMENT

Candidates are persisted accepted lineages whose canonical decision snapshot overlaps the newly observed branch and whose block identity conflicts with the current decision snapshot.

For each candidate:
1. reconstruct the candidate snapshot;
2. compare ordered block identities with the new snapshot;
3. use the canonical-decision branch/common-ancestor primitive to establish the fork point;
4. require a deterministic replacement range beginning at ancestor + 1;
5. require exactly one parent lineage candidate.

If no common ancestor, ambiguous parent, or conflicting candidate set exists: fail closed.

Generation is then the STEP 588 parent generation + 1.

Prior result and evidence remain immutable.

## 4. Outer transaction/recovery

The orchestration must capture `database.snapshot()` before canonical-decision creation because canonical-decision persistence is durable state.

Failure before successful STEP 568 persistence restores the outer snapshot and cannot reach authority/cursor.

After durable STEP 568 success, later authority/cursor failure preserves the result and lineage. Retry reconstructs the deterministic context rather than deleting evidence.

## 5. Exact processing-context construction

The orchestration must return the reconstructed lineage/result fields unchanged and add only the canonical-decision snapshot ID and orchestration provenance.

Required context:
- VERIFIED status;
- exact range;
- result/execution IDs;
- parent;
- transition;
- generation;
- canonical evidence IDs;
- emptyResult;
- evidenceSetDigest;
- lineageId;
- provenance;
- committedAt;
- canonicalDecisionSnapshotId.

## 6. Authority barrier

The authority gate must accept the verified context as an additional input.

Minimum checks:
- context exists;
- status VERIFIED;
- exact range equality;
- authority generation equals context generation;
- authority cursorBlock equals toBlock;
- existing expected-authority binding remains unchanged.

Authority cannot choose canonicality, generation, parent, transition, or evidence membership.

## 7. Cursor barrier

Only after authority returns successfully may `cursor.advance(toBlock)` run.

A raw counter, database.save(), or STEP 568 persistence alone cannot advance the cursor.

Cursor API remains unchanged.

## 8. Concurrency

Use the existing writer fence only. Assert ownership at canonical-decision admission, lineage/result persistence, authority, and cursor boundaries. No second lock.

## 9. Replay/restart/reorg

Identical input returns identical processing identities and generation.

Restart after durable result but before cursor reuses persisted lineage/result.

Reorg creates a new lineage/result with a new generation and preserves the replaced history.

## 10. Operator observability

The existing result/log boundary should expose only derived fields:
range, result ID, lineage ID, transition, generation, evidence digest, authority outcome, cursor outcome, and failure reason.

No new durable source of truth is introduced.

## 11. Acceptance mapping

The analysis maps all STEP 584 requirements to existing owners plus one orchestration adapter and a narrow authority-gate extension. No schema migration is required.

V4 remains INACTIVE.
