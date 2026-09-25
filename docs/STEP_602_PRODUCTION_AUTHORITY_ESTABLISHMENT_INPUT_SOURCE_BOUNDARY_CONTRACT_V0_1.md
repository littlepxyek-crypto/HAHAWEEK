# STEP 602 — Production Authority Establishment Input/Source Boundary Contract v0.1

- Status: CONTRACT
- Step: 602
- Predecessor: STEP 601 — Production Authority Lifecycle Persistence Analysis
- Baseline: `9c947c807872ad04e93e2eb3cfc7768ec59d6824`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Define the missing production-authority establishment source so STEP 600 lifecycle persistence can be implemented without treating expected authority, processing context, cursor state, writer state, or Surveillance output as production authority.

This contract defines a new explicit authority-bearing input boundary. It does not activate V4 or advance the cursor.

## 2. Source model

The production authority source SHALL be an explicit repository-owned establishment adapter with two distinct inputs:

1. a VERIFIED processing context supplied by the existing runtime owner; and
2. the exact verified F-03 expected-authority chain for the same range.

The adapter SHALL establish a production lifecycle record only when both inputs agree.

The adapter SHALL NOT derive authority from:
- cursor position;
- raw/canonical evidence alone;
- checkpoint existence alone;
- writer-fence state;
- timestamps/randomness/defaults;
- Surveillance;
- an unverified processing context.

## 3. Distinction from expected authority

Expected authority remains the durable expected commitment.

Production authority is an explicitly established runtime authority record whose commitment must equal the expected commitment through the existing binding formula.

The source SHALL therefore create the production lifecycle identity and establishment event separately from the F-03 expected-authority records.

No fallback from expected authority to production authority is permitted.

## 4. Establishment input

The adapter SHALL accept only a canonical establishment input containing:

- exact `fromBlock` / `toBlock`;
- VERIFIED processing-result/context identity;
- generation;
- cursor endpoint;
- canonical evidence-set digest;
- lineage identity;
- exact F-03 expected-authority identifiers/digests;
- source identity;
- deterministic establishment intent identity.

The processing context and expected-authority chain are authoritative for their respective fields. The source identity identifies the explicit establishment adapter, not an inferred actor.

The input MUST be validated before persistence.

## 5. Deterministic identity

The lifecycle identity SHALL be deterministically derived from the canonical establishment input and a versioned domain separator.

It SHALL NOT depend on wall-clock time, randomness, process ID, cursor state alone, or Surveillance output.

The binding digest remains the existing F-03 authority-binding digest and MUST NOT be reformulated.

## 6. Establishment transaction

The establishment operation SHALL:

1. assert existing writer-fence ownership;
2. validate VERIFIED processing context;
3. read and verify the exact F-03 expected-authority chain;
4. construct the compatible production-authority record;
5. compute/verify the existing binding digest;
6. persist the STEP 600 lifecycle record;
7. durably save using the existing database durability boundary;
8. return the established lifecycle identity.

If any step fails, no authoritative lifecycle record may be committed and the cursor remains unchanged.

The existing authority gate remains the final validation boundary before cursor advancement.

## 7. Runtime integration

The repository integration seam SHALL be:

`processorRange`
→ VERIFIED processing context
→ establishment source
→ lifecycle persistence
→ existing authority gate
→ unchanged cursor advance.

The source MUST be invoked before cursor advancement and MUST NOT advance the cursor itself.

The legacy single-block path remains unchanged unless a later explicit contract authorizes its integration.

## 8. Recovery/reorg

Recovery reads the immutable lifecycle record and revalidates its linked processing context/expected authority.

A canonical reorganization creates a new establishment identity only when canonical lineage supplies an explicit replacement relationship and generation change.

No lifecycle record is updated/deleted.

Ambiguous replacement, stale authority, missing predecessor, or generation conflict => STOP/FAIL-CLOSED.

## 9. Operator Acceptance

The source SHALL expose repository-grounded status sufficient to identify:

- source identity;
- establishment state;
- lifecycle identity;
- exact range/generation/cursor;
- expected-authority linkage;
- binding/provenance verification;
- recovery/replacement status;
- STOP/FAIL-CLOSED reason.

Concrete commands must be derived from actual implementation during Analysis/Design; this contract invents no command syntax.

## 10. Surveillance

Surveillance remains derived, evidence-linked, versioned, reproducible, and non-authoritative.

It cannot create, approve, replace, mutate, or advance production authority.

**ADDRESS != ACTOR.**

Temporal leakage remains prohibited.

## 11. Schema and authority preservation

The source SHALL use the STEP 600 lifecycle record boundary and existing schema migration/versioning mechanism.

It SHALL NOT modify the frozen F-03 authority representation, binding formula, canonical lineage/generation semantics, writer-fence semantics, cursor semantics, or raw/canonical evidence semantics.

No historical record may be rewritten or deleted.

## 12. Fail-closed conditions

Reject establishment for missing/unverified context, range mismatch, generation mismatch, cursor mismatch, expected-authority absence/ambiguity, invalid binding, provenance mismatch, duplicate conflicting lifecycle identity, writer-fence failure, ambiguous reorg, non-deterministic identity, partial durability, or unsupported schema.

No fallback/default authority, cursor reset/manual advance, silent normalization, or authority bypass.

## 13. Acceptance criteria

STEP 602 is accepted only when:
1. STEP 601 is VERIFIED/RECONCILED;
2. source ownership is explicit;
3. canonical establishment input is explicit;
4. deterministic lifecycle identity is explicit;
5. existing binding formula remains authoritative;
6. runtime integration order is explicit;
7. recovery/reorg semantics are explicit;
8. operator status requirements are explicit;
9. Surveillance remains non-authoritative;
10. no existing authority owner is duplicated;
11. contract is merged with required CI;
12. exact merge commit is post-merge verified;
13. reconciliation records evidence in PROJECT_STATE.

## 14. Next lifecycle

After STEP 602 verification/reconciliation: **STEP 603 Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.**

If Analysis finds that the source cannot be implemented without inventing semantics outside this contract, STOP and define the next explicit boundary.
