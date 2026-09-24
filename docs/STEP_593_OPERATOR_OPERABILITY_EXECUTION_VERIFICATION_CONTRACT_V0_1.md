# STEP 593 — Operator Operability Execution Verification Contract v0.1

Status: CONTRACT
Step: 593
Predecessor: STEP 592 — Operator Operability & Reproducible Runbook
Baseline: fb4e5e1fba83ad6b0967c7e0e5bed7a173d7881c
V4 production activation: INACTIVE

## Purpose

Freeze the smallest repository-grounded contract for proving that the human operator can actually execute the existing HAHAWEEK operational path, rather than merely having documentation that describes it.

This contract does not redefine runtime semantics and does not authorize production implementation outside the existing operator surface.

## Operator Acceptance

The operator path MUST be reproducible from repository-defined commands and existing scripts.

The verification boundary covers:

1. repository/setup prerequisites;
2. status inspection;
3. health inspection;
4. test execution;
5. one-shot scan invocation;
6. start invocation boundary;
7. failure recognition;
8. contract-authorized recovery recognition;
9. recovery verification;
10. STOP/FAIL-CLOSED conditions.

The repository remains the only source of truth for commands and procedures. No command may be invented for acceptance.

Existing repository operator surface observed at baseline:

- `./bin/hahaweek status`
- `./bin/hahaweek health`
- `./bin/hahaweek test`
- `./bin/hahaweek scan`
- `./bin/hahaweek start`
- `./bin/hahaweek repair`
- `npm test`
- `npm run health`
- `npm run scan`
- `npm start` / `node src/index.js` where repository semantics require it.

The implementation MUST NOT silently reinterpret or broaden these commands.

## Acceptance Evidence

For each accepted operator action, evidence MUST identify:

- exact repository command/script;
- expected observable result;
- failure indication;
- whether recovery is permitted;
- verification required after recovery;
- STOP/FAIL-CLOSED condition.

Operator documentation/tests may only assert behavior actually implemented by the repository.

## Frozen Semantic Owners

Unchanged:

- canonical decision semantics;
- canonical lineage/transition/generation;
- STEP 568 durable processing-result verification;
- STEP 590 runtime processing-context;
- existing authority boundary;
- BlockCursor API/order;
- existing single-writer fence;
- historical evidence and cursor integrity.

No operator command may bypass any of these owners.

## Recovery Boundary

Recovery MUST remain fail-closed.

Forbidden:

- cursor reset;
- historical rewrite;
- evidence deletion;
- silent normalization;
- manual canonical mutation to force success;
- authority bypass;
- writer-fence bypass;
- promotion of a derived/diagnostic result into authority.

If the repository does not provide a contract-authorized recovery path for a failure, the operator MUST STOP/FAIL-CLOSED.

The existing `repair` command is not granted authority to repair canonical history merely by existing; its behavior must be verified against repository implementation before it can be described as contract-authorized recovery.

## Surveillance Boundary

Surveillance remains:

- derived;
- evidence-linked;
- versioned;
- reproducible;
- non-authoritative.

It MUST NOT:

- mutate raw/canonical evidence;
- advance the cursor;
- grant authority;
- perform automated action/trading;
- infer ownership or actor identity without evidence;
- treat ADDRESS as ACTOR;
- introduce temporal leakage;
- score/rank/risk without contract, validation, uncertainty, and evidence.

Operator observability MUST NOT become a new source of truth.

## Authorized Scope

This contract authorizes only:

- repository-grounded operator execution analysis;
- focused operator acceptance tests/fixtures where required;
- runbook/operability documentation derived from verified implementation;
- minimal derived status/output documentation where already supported.

It does NOT authorize:

- schema migration;
- new dependency;
- new writer/lock/authority;
- cursor API/order changes;
- canonical evidence mutation;
- historical rewrite/deletion;
- V4 production activation;
- automated trading/action;
- unsupported Surveillance implementation.

## Acceptance Criteria

STEP 593 may complete only when:

1. operator commands are verified against actual repository scripts;
2. setup/status/health/test/scan/start boundaries are evidenced;
3. failure and STOP/FAIL-CLOSED behavior are evidenced;
4. recovery claims are limited to repository-supported behavior;
5. operator acceptance tests/documentation pass;
6. Security/Regression and required CI pass;
7. review evidence exists without self-approval claim;
8. implementation is merged;
9. exact merge-commit verification passes;
10. reconciliation and PROJECT_STATE documentation record the result.

V4 remains INACTIVE. Gate 2 PASS is neither asserted nor implied.

Next STEP after successful completion: STEP 594.
