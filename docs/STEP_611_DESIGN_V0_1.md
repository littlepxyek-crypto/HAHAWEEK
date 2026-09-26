# HAHAWEEK — STEP 611 Design v0.1

Status: DESIGN — IN PROGRESS
Step: 611 — Lifecycle State Authority & Next-Step Boundary
Contract: `docs/STEP_611_LIFECYCLE_STATE_AUTHORITY_NEXT_STEP_BOUNDARY_CONTRACT_V0_1.md`
Analysis: `docs/STEP_611_ANALYSIS_V0_1.md`

## 1. DESIGN GOAL

Define the smallest deterministic validator that detects lifecycle-state ambiguity before it can authorize an invalid Next STEP.

The validator is read-only and diagnostic. PROJECT_STATE.md remains the authority.

## 2. INPUT

The validator accepts lifecycle-state text as an input string.

It does not read/write repository files itself and does not mutate runtime state.

## 3. REQUIRED CURRENT-STATE FIELDS

A valid current-state document must expose:
- exactly one current STEP declaration at the top-level current-state boundary;
- current lifecycle phase/status;
- Contract reference;
- explicit Next STEP or explicit terminal/blocked state.

The validator must distinguish the current-state section from historical sections.

## 4. HISTORICAL BOUNDARY

Historical STEP sections after the current-state boundary are ignored for current authorization.

Their stale Next STEP text MUST NOT be treated as current authority.

## 5. CONFLICT DETECTION

FAIL-CLOSED when the current-state boundary contains:
- more than one competing current STEP declaration;
- multiple incompatible phase declarations;
- multiple incompatible Next STEP declarations;
- missing Contract for an active STEP;
- an implementation phase without an explicitly authorized Contract;
- malformed state markers.

Historical stale metadata alone is not a conflict when the current-state boundary is unambiguous.

## 6. RESULT MODEL

Return a deterministic result containing:
- valid boolean;
- current STEP;
- current phase/status;
- Contract reference;
- Next STEP;
- error codes, sorted deterministically.

No result is authoritative over PROJECT_STATE.md.

## 7. ERROR VOCABULARY

Use stable codes:
- STATE_STEP_MISSING
- STATE_CONTRACT_MISSING
- STATE_PHASE_MISSING
- STATE_NEXT_STEP_MISSING
- STATE_STEP_CONFLICT
- STATE_PHASE_CONFLICT
- STATE_NEXT_STEP_CONFLICT
- STATE_MALFORMED

## 8. OPERATOR ACCEPTANCE

The validator output must make it possible to identify:
- current STEP;
- current phase;
- Contract;
- Next STEP;
- exact fail-closed reason.

No new recovery or mutation command is introduced.

## 9. TEST / GOLDEN VECTORS

Tests must cover:
1. valid STEP 611 current state;
2. stale historical Next STEP that does not override current state;
3. missing Contract;
4. conflicting current STEP;
5. conflicting current Next STEP;
6. missing Next STEP;
7. deterministic error ordering;
8. input immutability.

## 10. SECURITY / PRESERVATION

Implementation must not:
- rewrite PROJECT_STATE.md;
- rewrite historical documents;
- mutate raw/canonical evidence;
- change cursor;
- change V4 authority;
- create database authority;
- infer actor identity;
- add scoring/risk/trading/automated action.

## 11. ACCEPTANCE

Design is acceptable when the implementation can be directly traced to the Contract and Analysis, all failure modes are deterministic, and no production authority is expanded.

## 12. NEXT

After Design verification/reconciliation/documentation, continue to Code.
