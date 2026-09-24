# STEP 556 — F-03 Cursor Boundary Contract Reconciliation v0.1

Status: RECONCILIATION
Step: 556
Contract merge: PR #287
Contract commit: `876046805670acfe4acd7a6b0cd2fde13f49bd29`

## 1. Purpose

Record post-merge reconciliation for the STEP 556 F-03 cursor-boundary contract amendment.

## 2. Contract result

STEP 556 selected and froze **Model A — Segment boundary is the cursor authority**.

Normative invariant:

`cursorBlock == persisted verified f03_segments.to_block`

The amendment introduces no independent cursor field or cursor-authority record.

## 3. Scope

The amendment fixes:

- exact-range semantics;
- durable provenance boundary;
- separation of submitted authority from durable expected authority;
- checkpoint-before-cursor ordering;
- restart/durability behavior;
- concurrency/conflict behavior;
- fail-closed mismatch handling;
- STEP 550 expected-authority tuple construction.

It does not activate V4 production authority or declare Design Gate 2 PASS.

## 4. CI evidence

On the STEP 556 contract head `1fc833b7a5c99436703195420b5c95f3bda08ce6`:

- HAHAWEEK Tests run `35958752886` — SUCCESS
- HAHAWEEK Security and Regression run `35958752889` — SUCCESS

No production-code tests were introduced because STEP 556 is a contract amendment only.

## 5. Review and merge

PR #287 received a contract review comment.

PR #287 was merged with:

`876046805670acfe4acd7a6b0cd2fde13f49bd29`

The merged contract was fetched from `main` and verified present with SHA:

`2cb4e0a3827288b7c1a3336e0165d999b554dd42`

The exact merge commit workflow lookup returned no workflow runs. Therefore no post-merge CI success is claimed for the merge commit itself.

## 6. Security/reconciliation result

The contract closes the STEP 555 cursor-boundary ambiguity without manufacturing authority state.

Preserved constraints:

- no cursor reset;
- no cursor migration;
- no historical rewrite;
- no evidence deletion;
- no silent normalization;
- no independent cursor persistence;
- no V4 activation;
- no Design Gate 2 PASS.

## 7. Status

STEP 556 contract amendment is reconciled.

The STEP 555 implementation remains incomplete and is now contractually unblocked. Production implementation must still satisfy the STEP 554 contract plus this STEP 556 amendment and must prove the required positive/negative test matrix before any claim of completion.

## 8. Next STEP

Continue the incomplete F-03 implementation sequence under the newly frozen cursor-boundary contract. No V4 production activation occurs until Design Gate 2 acceptance criteria are actually satisfied.
