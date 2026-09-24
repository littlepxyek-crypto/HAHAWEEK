# STEP 558 — Design Gate 2 Remaining Acceptance Evidence Contract v0.1

Status: CONTRACT
Step: 558
Baseline: STEP 557 F-03 VERIFIED / FROZEN on `main`

## Purpose

Close the remaining Design Gate 2 evidence boundary without activating V4 production authority.

STEP 557 closed F-03. STEP 558 audits and, where necessary, adds executable evidence for the gate-wide acceptance conditions that remain independent of individual F/H control closure.

## Acceptance boundary

The following six conditions are audited exactly as stated by Design Gate 2:

1. F-01 through F-05 are VERIFIED/FROZEN with executable evidence.
2. H-01 through H-05 are VERIFIED/FROZEN or explicitly dispositioned with verified controls.
3. The V4 canonical reference implementation agrees with the committed golden vectors.
4. The independent offline verifier validates the same protocol artifacts without importing production reference modules.
5. The legacy/V4 authority boundary is enforceable at the actual production ingestion boundary.
6. Historical evidence and artifacts remain preserved.

## Required evidence

### A. Reference/golden-vector equivalence

Evidence MUST demonstrate:

- reference implementation produces the stored golden-vector canonical bytes and hashes;
- mutations are rejected;
- no silent normalization changes expected values;
- golden-vector coverage remains complete.

### B. Independent offline verification

Evidence MUST demonstrate:

- verifier runs offline/local only;
- verifier does not import `src/reference/v4/*`;
- committed golden vectors are independently verified;
- tampering, duplicate identity, malformed input, and recovery corruption fail closed.

### C. Legacy/V4 boundary enforceability

Evidence MUST demonstrate at the production ingestion boundary:

- complete authority record is required;
- durable expected authority is read from the persisted F-03 chain;
- submitted/live authority cannot manufacture expected authority;
- authority binding occurs before cursor advancement;
- missing/malformed/stale/conflicting authority fails closed;
- cursor cannot advance without the authoritative chain;
- legacy state cannot silently outrank the durable expected authority;
- no V4 activation is performed by this evidence step.

### D. Historical preservation

Evidence MUST demonstrate:

- prior contracts remain present;
- golden vectors remain unchanged;
- historical reconciliation artifacts remain present;
- no historical state is rewritten or deleted;
- changes are additive and traceable.

## Design rule

If current executable evidence already satisfies a condition, preserve it and add only a deterministic audit/reconciliation artifact.

If a required link is missing, add the smallest executable test or documentation necessary to close that exact link.

No new V4 semantic authority, migration, RPC behavior, cursor semantics, or production activation may be introduced.

## Fail-closed rule

Any mismatch between:

- reference output and golden vector,
- independent verifier and golden vector,
- durable expected authority and submitted authority,
- authority and cursor boundary,
- current repository artifacts and recorded history

must fail the STEP and block Gate 2 PASS.

## Explicit non-goals

- No V4 production activation.
- No cursor reset or migration.
- No historical rewrite/deletion.
- No frozen-contract modification.
- No RPC/provider change.
- No new protocol semantics.
- No predictive/ranking/trading/signing/publication behavior.

## Exit condition

STEP 558 may conclude only when all six Gate 2 acceptance conditions have executable/documented evidence on current `main`, all required CI checks pass, reconciliation is merged, and Gate 2 is either objectively PASS or remains NOT PASSED with a precisely identified blocker.

Gate 2 MUST NOT be marked PASS by assumption.
