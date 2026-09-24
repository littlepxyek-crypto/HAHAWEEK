# STEP 582 — Runtime Canonical Lineage / Processing Context Integration Implementation Contract v0.1

Status: CONTRACT
Step: 582
Predecessor: STEP 581
Baseline: 16717bcbb115e954ad6e35ba7d333c880f2f2482
V4 production activation: INACTIVE

## 1. Purpose

Define the exact implementation boundary for integrating the frozen STEP 581 design into the production runtime.

The implementation must replace the current counter-only success path with a verified canonical processing-context boundary:

canonical decision snapshot
→ exact raw ingestion
→ STEP 579 canonical lineage
→ STEP 568 durable processing-result verification
→ immutable verified context
→ exact authority binding
→ cursor advancement.

This contract authorizes implementation only. It does not authorize V4 production activation, cursor API redesign, schema redesign, new dependencies, historical rewriting, or unrelated architecture.

## 2. Repository source of truth

Implementation MUST start from the actual main state at baseline commit `16717bcbb115e954ad6e35ba7d333c880f2f2482` and preserve all valid historical artifacts and frozen contracts.

The frozen STEP 581 analysis and design remain authoritative:
- `docs/STEP_581_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_ANALYSIS_V0_1.md`
- `docs/STEP_581_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_DESIGN_V0_1.md`

No semantic owner may be duplicated.

## 3. Authorized production scope

The implementation MAY:
1. add the smallest orchestration adapter required to construct a verified processing context;
2. connect the existing canonical decision input to the existing raw ingestion path;
3. invoke STEP 579 canonical lineage acceptance for the exact range;
4. use STEP 568 durable persistence/reconstruction as the verification boundary;
5. bind the resulting immutable context to the existing authority gate;
6. place cursor advancement strictly after successful exact-context authority validation;
7. add tests required to prove these boundaries.

The implementation MUST NOT:
- create a second canonicality authority;
- derive generation from persistence, authority, cursor, timestamp, or defaults;
- introduce a second writer fence;
- reset or rewrite the cursor;
- delete or mutate prior immutable evidence;
- silently normalize ranges;
- rewrite historical lineage;
- activate V4 production authority;
- add unrelated dependencies or architecture;
- change frozen STEP 568/579 semantics;
- redesign the cursor API unless a separate contract explicitly authorizes it.

## 4. Required runtime contract

The production processing operation MUST operate on an exact `fromBlock` / `toBlock` range and return only after constructing and verifying an immutable context containing at minimum:

- `status`
- `fromBlock`
- `toBlock`
- `processingResultId`
- `processingExecutionId`
- `parentResultId`
- `transitionType`
- `generation`
- `canonicalEvidenceIds`
- `emptyResult`
- `evidenceSetDigest`
- `lineageId`
- `provenance`
- `committedAt`

Values owned by STEP 579 or STEP 568 MUST be passed through unchanged and MUST NOT be recomputed downstream.

## 5. Mandatory execution ordering

The implementation MUST enforce:

A. Validate exact range and required preconditions.

B. Establish/assert the existing single-writer fence.

C. Create and validate the canonical decision snapshot for exactly the requested range.

D. Capture/use the existing database snapshot/restore primitive.

E. Ingest raw evidence for exactly that range.

F. Invoke STEP 579 canonical lineage acceptance with the exact canonical snapshot.

G. Require successful STEP 568 durable persistence and verification.

H. Reconstruct/verify the resulting immutable lineage/result context.

I. Bind authority to the exact verified context, including exact range and processing identity/lineage fields available under the existing authority contract.

J. Only after successful authority validation call the existing cursor advancement.

No earlier intermediate success may satisfy authority or cursor semantics.

## 6. Failure-closed requirements

The implementation MUST fail closed for:
- invalid or reversed ranges;
- missing/malformed canonical snapshot;
- snapshot/range mismatch;
- chain identity or confirmation mismatch;
- invalid canonical evidence;
- raw ingestion failure;
- lineage identity/parent/generation/transition mismatch;
- processing-result conflict;
- evidence-set digest mismatch;
- durable save failure;
- reconstruction mismatch;
- writer-fence loss;
- authority range/context mismatch;
- cursor regression/write failure;
- concurrent conflicting same-range processing;
- restart reconstruction mismatch.

Before durable save succeeds, failures MUST restore the pre-operation database snapshot using the existing primitive and MUST NOT advance the cursor.

If durable immutable processing evidence succeeds and a later authority/cursor boundary fails, the implementation MUST preserve that historical evidence rather than deleting it to make the cursor appear contiguous.

## 7. Replay and restart

Identical replay of an unchanged canonical snapshot and exact range MUST resolve idempotently to the same deterministic processing identities and evidence-set digest without creating a new generation or conflicting duplicate.

Restart MUST reconstruct the same durable verified context when canonical state is unchanged.

If canonical state changed, STEP 579 MUST determine the transition and generation; the integration MUST NOT manufacture reorg semantics.

## 8. Reorg

Reorg replacement MUST:
- preserve the prior immutable result and lineage;
- use STEP 579 `REORG_REPLACEMENT` semantics;
- create/use the required new generation;
- persist the replacement as new immutable evidence;
- expose only the newly verified exact context downstream.

The integration MUST NOT infer reorg state from cursor movement or expected authority.

## 9. Concurrency

The existing `single-writer-fence.js` remains the sole write authority.

The implementation MUST NOT add another mutex, lock file, or competing ownership mechanism.

Fence ownership MUST be checked at the critical mutation/checkpoint boundaries required by the STEP 581 design, including immediately before authority and cursor advancement where applicable.

## 10. Tests and acceptance criteria

The implementation is accepted only if tests prove at minimum:

### Positive
1. exact canonical range creates one verified context;
2. empty result is explicit and deterministic;
3. identical replay is idempotent;
4. restart reconstructs the same durable context;
5. continuation preserves parent/generation semantics;
6. reorg replacement creates a distinct generation and preserves prior history;
7. historical transitions remain append-only.

### Negative
8. snapshot range mismatch is rejected;
9. missing snapshot is rejected;
10. invalid canonical evidence is rejected;
11. evidence digest tampering is rejected;
12. parent/generation/transition mismatch is rejected;
13. processing-result identity conflict is rejected;
14. writer-fence loss fails closed;
15. save failure restores state;
16. authority range/context mismatch does not advance cursor;
17. cursor regression/write failure is fail-closed;
18. concurrent conflicting same-range processing is rejected.

### Integration boundary
19. raw-ingestion success alone cannot advance cursor;
20. authority cannot consume an unverified processing context;
21. expected authority cannot supply canonicality/generation;
22. prior historical evidence survives reorg;
23. no cursor reset occurs;
24. existing STEP 568/579 golden vectors remain unchanged.

Tests MUST be deterministic and run serially where shared persistence requires it.

## 11. Security / regression requirements

Security and regression verification MUST demonstrate the trust chain:

canonical decision snapshot
→ canonical lineage
→ durable evidence/result verification
→ exact-context authority binding
→ cursor.

A broken edge is a hard failure.

Required regression checks MUST include existing `npm test`, V4 verification/coverage checks, dependency audit, tracked-secret detection, and CodeQL/security workflow as configured by the repository.

No test may be weakened or bypassed solely to obtain a green result.

## 12. V4 boundary

This STEP does not activate V4 production authority.

V4 production activation remains INACTIVE.

No Gate 2 PASS may be claimed by this contract or its implementation unless every separately defined Gate 2 criterion is actually evidenced.

## 13. Traceability

Requirement
→ STEP 582 Contract
→ Analysis
→ Design
→ Code
→ Test
→ Security/Regression
→ CI
→ Review
→ Merge
→ Post-Merge Verification
→ Reconciliation
→ Documentation.

The implementation PR MUST identify the exact files changed and explain why each change is required by this contract.

## 14. Completion criteria

STEP 582 cannot be marked complete until:
- this contract is merged;
- implementation analysis/design is complete within scope;
- production code is implemented without frozen-semantic drift;
- all required tests pass;
- Security/Regression passes;
- required CI passes;
- review evidence exists;
- merge succeeds;
- post-merge verification is performed against the exact merge commit;
- reconciliation and documentation are committed;
- the next STEP is explicitly recorded.

Next STEP after this contract is the implementation analysis/design work defined by the mandatory execution sequence.
