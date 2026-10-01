# STEP 614 — Contract Amendment: Runtime F-03 Expected-Authority Establishment v0.1

Status: CONTRACT AMENDMENT — PROPOSED / NOT YET AUTHORIZED FOR IMPLEMENTATION
Step: 614
Baseline: 7cfcb897a12eb12eca693504292e387ce4776e0c
Parent Contract: docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md

## 1. Purpose

Define the smallest additional contract boundary required by actual Termux evidence showing that the runtime can reach verified processing/canonical recovery but stops at `F03_CHAIN_NOT_FOUND` because the durable expected-authority chain for the exact processed range is absent.

This amendment does not declare LIVE and does not authorize V4 activation.

## 2. Problem Boundary

The current runtime sequence is:

VERIFIED PROCESSING CONTEXT
→ production authority gate
→ durable expected-authority reader
→ F03_CHAIN_NOT_FOUND
→ cursor unchanged
→ FAIL-CLOSED.

The repository already freezes deterministic V4 segment, manifest, checkpoint, and generation derivation. The missing boundary is an explicit, separately ordered establishment operation that can make the exact expected F-03 chain durable before the normal expected-authority gate consumes it.

## 3. Scope

This amendment authorizes a narrowly bounded Analysis/Design/Code/Test lifecycle for a repository-owned runtime F-03 expected-authority establishment adapter.

The adapter may establish an F-03 chain only when all required inputs are already VERIFIED and durably reconstructible from the repository's existing processing context and evidence contracts.

The normal authority gate remains unchanged in ordering and continues to read expected authority from the durable F-03 chain.

## 4. Required semantic boundary

The establishment operation MUST be a distinct phase before the expected-authority read for a previously absent exact range.

It MUST:

1. obtain an exact VERIFIED processing context for the same range;
2. obtain the persisted processing result and its canonical evidence membership;
3. reconstruct and cryptographically verify each referenced evidence record;
4. derive segment/manifest/checkpoint commitments only through the existing frozen `deriveV4EvidenceCommitment` semantics;
5. derive generation only from the VERIFIED processing context;
6. create complete F-03 provenance from the verified processing context and evidence-set identity;
7. persist segment → manifest → checkpoint atomically through the existing `commitF03AuthorityChain` mechanism;
8. re-read and verify the durable F-03 chain;
9. only after successful durable verification allow the normal expected-authority reader to proceed.

No cursor advancement is owned by the establishment adapter.

## 5. Independence and authority

The establishment adapter MUST NOT:

- read an existing expected-authority chain and copy it;
- use production-authority lifecycle records as its source;
- manufacture commitments from cursor position, timestamp, writer-fence state, randomness, or arbitrary metadata;
- bypass `createAuthorityGate`;
- weaken `AUTHORITY_EXPECTED_SOURCE_MUST_BE_DISTINCT`;
- use Surveillance output;
- advance the cursor.

After establishment, `readF03AuthorityChain()` remains the authoritative expected-source reader for the normal gate.

The establishment operation is an authority-preparation operation, not a submitted-authority result and not V4 activation.

## 6. Exact range and temporal boundary

The establishment range MUST equal the currently processed range exactly.

It MUST NOT establish:

- a range inferred from latest RPC head;
- a range broader than the VERIFIED processing context;
- a range narrower than the VERIFIED processing context;
- a range whose processing result is unavailable or unverified.

The operation MUST NOT use future information to establish historical authority.

## 7. Evidence and integrity

All existing evidence remains preserved.

The adapter MUST fail closed on:

- missing processing result;
- processing-result integrity conflict;
- missing canonical evidence;
- evidence identity/hash mismatch;
- incomplete evidence membership;
- invalid canonicality;
- generation mismatch;
- range mismatch;
- segment/manifest/checkpoint mismatch;
- existing conflicting F-03 chain;
- provenance mismatch;
- writer-fence loss;
- durable-save failure;
- provider/recovery ambiguity.

An already existing valid F-03 chain MUST be treated as idempotent and verified, not rewritten.

## 8. Recovery and replay

For an exact absent range:

LAST VERIFIED PROCESSING CONTEXT
→ VERIFY DURABLE PROCESSING RESULT
→ DERIVE DETERMINISTIC COMMITMENTS
→ COMMIT F-03 CHAIN
→ RE-READ/VERIFY
→ NORMAL EXPECTED-AUTHORITY READ
→ AUTHORITY GATE
→ CURSOR ONLY AFTER AUTHORIZATION.

Interrupted persistence MUST restore the pre-establishment database snapshot.

Restart MUST reproduce the same commitments from the same preserved evidence.

No delete/reset/rebuild shortcut is permitted.

## 9. Reorg

A reorg-invalidated processing context MUST NOT establish an F-03 chain.

Only the currently VERIFIED canonical processing context may establish a new generation.

Existing F-03 history MUST remain immutable. Replacement is additive and generation-bound.

Ambiguous reorg state MUST fail closed.

## 10. Concurrency

The existing single-writer fence remains the only writer authority.

Establishment MUST run under that fence and verify ownership before and after persistence.

No second lock or writer authority may be introduced.

## 11. Operator Acceptance

The existing supported commands remain unchanged:

- ./bin/hahaweek status
- ./bin/hahaweek test
- ./bin/hahaweek health
- ./bin/hahaweek scan
- ./bin/hahaweek start
- ./bin/hahaweek repair

No new operator command is authorized by this amendment.

Operator-visible behavior must remain fail-closed and diagnosable. A successful establishment must be observable through the existing runtime/status evidence without manufacturing a healthy state.

## 12. Surveillance

Surveillance remains derived and non-authoritative.

The establishment path MUST NOT consume Surveillance output, actor inference, scoring, narrative analysis, or automated action.

ADDRESS != ACTOR.

## 13. Non-goals

This amendment does not authorize:

- V4 production activation;
- trading, signing, or execution;
- cursor reset/manual advancement;
- historical evidence deletion/rewrite;
- provider/RPC authority changes;
- new schema unless Analysis proves an existing schema is insufficient and a separate amendment is required;
- fallback authority;
- weakening source-separation checks;
- automatic recovery from ambiguous authority;
- declaring LIVE from repository CI alone.

## 14. Acceptance criteria

The amendment may authorize implementation only after:

1. Contract review confirms source separation remains intact.
2. Analysis proves the existing frozen commitment derivation is sufficient.
3. Design defines exact establishment ordering and failure atomicity.
4. Tests cover absent-chain establishment, idempotent replay, conflict, malformed evidence, missing evidence, generation mismatch, reorg, writer-fence failure, persistence failure, restart, and cursor non-advancement on failure.
5. Security/Regression confirms no authority bypass, no cursor bypass, no historical mutation, and no Surveillance authority.
6. CI, review, merge, post-merge verification, reconciliation, and documentation complete.
7. Actual Termux runtime exercises the recovery path.

## 15. Completion boundary

This amendment does not itself establish any F-03 authority.

It is a contract boundary only.

VERIFIED LIVE remains forbidden until the full repository lifecycle and actual operator runtime evidence satisfy the existing STEP 614 LIVE-READINESS Gate.

## 16. Next authorized phase

If this amendment is accepted and merged:

Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Actual Operator Runtime Verification.
