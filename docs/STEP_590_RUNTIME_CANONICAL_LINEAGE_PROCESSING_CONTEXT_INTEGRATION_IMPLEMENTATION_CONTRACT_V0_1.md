# STEP 590 — Runtime Canonical Lineage / Processing Context Integration Implementation Contract v0.1

Status: CONTRACT
Step: 590
Predecessor: STEP 589
Baseline: ced42aff2162a600c1d0b3a87679c6980b43b715
V4 production activation: INACTIVE

## 1. Purpose
Authorize the smallest production implementation that realizes the repository-grounded STEP 589 analysis/design while preserving all frozen STEP 568/579/588 semantics.

Required runtime path:

canonical decision snapshot → exact raw ingestion → persisted canonical lineage → durable verified processing result → verified processing context → authority binding → cursor advancement.

This contract authorizes implementation only. It does not activate V4 production.

## 2. Frozen semantic owners
- STEP 576/578 owns canonical decision input/snapshot semantics.
- STEP 579 owns canonical lineage transition history and identity formulas.
- STEP 588 owns generation establishment.
- STEP 568 owns durable processing-result verification and evidence-set commitment.
- Existing authority integration owns authority validation/binding.
- Existing BlockCursor API/order remains unchanged.
- Existing single-writer-fence remains the sole writer authority.

No implementation may recompute or replace these semantics.

## 3. Authorized implementation boundary
The implementation is limited to the smallest repository-compatible changes required by STEP 589:
- new src/core/runtime-processing-context.js;
- src/index.js wiring only where required;
- src/core/ingestion.js success-boundary/context propagation only where required;
- src/core/f03-ingestion-authority-integration.js only to bind and validate the verified processing context;
- focused tests and regression fixtures;
- derived operator output from the verified context.

No schema migration or new dependency is authorized by this contract.
Any additional production file or semantic change is a blocker requiring a new contract.

## 4. Processing-context contract
The orchestration MUST return an immutable VERIFIED context containing:
- status; fromBlock; toBlock; processingResultId; processingExecutionId; parentResultId; transitionType; generation; canonicalEvidenceIds; emptyResult; evidenceSetDigest; lineageId; provenance; committedAt; canonicalDecisionSnapshotId.

Existing STEP 568/579 fields must be reconstructed/read, not recomputed.
The orchestration may add only explicitly derived orchestration provenance.

## 5. Required ordering
The implementation MUST execute this barrier order:
1. validate exact range;
2. assert existing writer ownership;
3. capture outer database snapshot before canonical-decision persistence;
4. create/reconstruct the exact canonical decision snapshot;
5. ingest raw evidence for the exact range;
6. resolve transition, parent, and generation from persisted canonical evidence;
7. invoke STEP 579 lineage acceptance;
8. persist/reconstruct and verify the STEP 568 processing result;
9. return only VERIFIED context;
10. bind authority to the verified context;
11. advance cursor only after authority succeeds.

Raw ingestion counters, database.save(), checkpoint state, expected authority, or cursor state MUST NOT substitute for the verified processing context.

## 6. Transition and parent resolution
### INITIAL
- no parent;
- transition INITIAL;
- generation exactly 1 under STEP 588.
A parent supplied for INITIAL is rejected.

### CONTINUATION
- identify persisted accepted lineage ending immediately before the requested range;
- reconstruct its canonical decision snapshot;
- verify branch compatibility against the current canonical decision;
- require exactly one valid accepted parent;
- inherit the persisted parent generation unchanged.
Zero or multiple valid parents is a hard failure.

### REORG_REPLACEMENT
- identify persisted accepted lineages overlapping/conflicting with the new canonical branch;
- reconstruct candidate and current canonical decision snapshots;
- establish the common ancestor using the existing canonical-decision primitive;
- require a deterministic replacement range and exactly one replaced parent;
- use STEP 588 generation = parent generation + 1 with uint64 overflow rejection.
Prior results/evidence remain immutable.
No parent selection may use cursor or authority state.

## 7. Durability and recovery
The outer database snapshot MUST be captured before canonical-decision writes.
Before durable STEP 568 processing-result success: restore the outer snapshot on failure; do not invoke authority; do not advance cursor.
After durable immutable result/lineage success: preserve the result/evidence on authority/cursor failure; leave cursor unchanged; retry MUST reconstruct/reuse the deterministic durable context; never delete or rewrite historical evidence.

## 8. Authority barrier
The existing authority gate MUST receive the verified processing context.
It MUST reject missing context, non-VERIFIED context, exact-range mismatch, authority generation mismatch, authority cursor endpoint mismatch, and existing expected-authority binding conflict.
Authority MUST NOT establish canonicality, transition, parent, generation, processing identity, or evidence membership.
If implementation requires a new authority semantic owner or contract change beyond this binding extension, STOP and create a new contract.

## 9. Cursor barrier
BlockCursor.advance(toBlock) remains unchanged.
The cursor may advance only after the processing context is VERIFIED, authority accepts the exact context, and writer ownership is still held.
No cursor reset, skip, rollback-by-rewrite, or historical rewrite is permitted.

## 10. Concurrency
Use only the existing single-writer fence.
Ownership MUST be asserted at canonical-decision admission, lineage/result persistence, authority, and cursor boundaries.
No second mutex, lock, lease, or writer authority may be introduced.

## 11. Replay / restart / reorg
Identical canonical decision input and exact range MUST produce identical deterministic result/execution/lineage identity and generation.
Restart after durable result but before cursor advancement MUST reuse the persisted context rather than create a conflicting duplicate.
A canonical reorg MUST create the contract-defined replacement lineage/result with a new generation while preserving the replaced history.

## 12. Operator Acceptance
The implementation MUST expose only derived, reproducible operational information and MUST NOT create a new source of truth.
The operator must be able to determine setup validity, runtime health, exact processed range, result/lineage identity, transition/generation, evidence-set digest, authority outcome, cursor outcome, failure category/reason, whether recovery is permitted, and when to STOP/FAIL-CLOSED.
No command or procedure may be invented for documentation. Operator instructions must be derived from repository CLI/scripts and verified in implementation tests.

## 13. Surveillance boundary
Surveillance remains downstream, derived, evidence-linked, versioned analysis only.
This implementation MUST NOT mutate raw/canonical evidence, become a source of truth, advance the cursor independently, create authority, perform automated action/trading, assert actor ownership from address observation, violate ADDRESS != ACTOR, introduce temporal leakage, add scoring/risk semantics without a separate contract, or treat compatibility/audit documentation as implementation authorization.
Any future surveillance implementation requires its own Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Verification → Reconciliation sequence.

## 14. Acceptance tests
Positive: INITIAL generation 1; CONTINUATION inherits parent generation; REORG replacement increments generation; exact range produces VERIFIED context; empty result is explicit; deterministic replay is idempotent; restart after durable result reuses identity; operator output exposes only derived verified context.
Negative: missing/ambiguous parent; branch mismatch; missing common ancestor; generation overflow; missing/unverified authority context; authority range/generation mismatch; raw-only success; writer-fence loss; save failure; cursor regression; concurrent same-range conflict; evidence/digest tampering; lineage/result conflict.
Regression: STEP 568/579 golden vectors unchanged; schema remains version 7; cursor API remains unchanged; no historical rewrite; no silent normalization; no V4 production activation.

## 15. Security / Regression / CI
Required: npm test; npm run verify:v4; npm run verify:v4:coverage; dependency audit; tracked-secret detection; HAHAWEEK Security and Regression; CodeQL; exact PR-head evidence; exact merge-commit post-merge evidence.
Tests MUST NOT be weakened to obtain green CI.

## 16. Review / merge / verification
The implementation PR must document Requirement → Contract → Code → Test → Security/Regression → CI → Review → Commit → PR → Merge → Post-Merge Verification → Reconciliation.
No MERGED/VERIFIED/COMPLETE claim is valid without actual repository evidence.

## 17. V4 boundary
V4 production activation remains INACTIVE.
Gate 2 PASS is not implied by this contract and may only be declared when every separately defined Gate 2 criterion has actual evidence.

## 18. Completion
STEP 590 is complete only after this implementation contract is merged; authorized production implementation is merged; focused tests and regression pass; Security/Regression and CI pass; review evidence exists; exact merge commit post-merge verification passes; reconciliation and PROJECT_STATE documentation are updated; and the next STEP is recorded.
Any out-of-scope discovery becomes the next documented STEP rather than an implicit semantic change.
