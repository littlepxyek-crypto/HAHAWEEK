# A9 — Continuous Acquisition Runtime Contract v0.1

## Status
IMPLEMENTATION AUTHORIZED

## Contract
HAHAWEEK-A9-CONTINUOUS-ACQUISITION-RUNTIME-V0_1

## Objective
Establish a bounded continuous acquisition runtime above the A8 acquisition boundary.

The runtime MUST:
- keep execution state separate from authoritative evidence;
- use an explicit backend selected by policy;
- validate every target through the A8 target policy before network use;
- acquire only within bounded cycles;
- preserve checkpoint and lease state independently of domain evidence;
- fail closed on backend failure, policy failure, lease loss, malformed results, or ambiguous ownership;
- never silently escalate from one backend to another;
- never mutate raw/canonical evidence, cursor, formation, outcome, validation, radar, or historical records.

## In scope
- stable AcquisitionRuntime interface;
- bounded HTTP acquisition backend;
- continuous cycle runner;
- execution lifecycle and telemetry;
- checkpoint/recovery state;
- single-owner lease semantics;
- cancellation;
- deterministic replay of the same request/checkpoint fixture;
- live network verification against an explicitly allowlisted public target.

## Out of scope
- Scrapling activation;
- Patchright/browser activation;
- Agent-Reach activation;
- crawling/discovery expansion beyond explicitly supplied targets;
- stealth, anti-detection, WAF bypass;
- automatic target discovery;
- evidence canonicalization;
- evidence graph mutation;
- cursor advancement;
- actor/wallet inference;
- prediction, ranking, trading, signing, publication, or external action.

## Lifecycle
REQUESTED -> VALIDATING -> LEASED -> EXECUTING -> CAPTURED -> VERIFIED -> CHECKPOINTED -> RELEASED

Failure states:
VALIDATION_FAILED, LEASE_FAILED, EXECUTION_FAILED, VERIFICATION_FAILED, CANCELLED, LEASE_LOST.

## Execution evidence vs domain evidence
Execution telemetry proves how an acquisition was attempted/executed.
Domain evidence is the observed source content returned by a backend.
Execution telemetry MUST NOT be promoted to domain authority.

## Backend rules
- Backend selection is explicit.
- Backend identity and version are recorded.
- Unknown backend is rejected.
- Backend failure returns FAILED/UNAVAILABLE; it does not trigger implicit fallback.
- A future adapter may be Scrapling or Patchright, but activation requires a separate contract.

## Checkpoint rules
- Checkpoint is execution state, not evidence.
- Checkpoints are immutable snapshots.
- Resume uses the latest valid checkpoint for the same runtime/request identity.
- No cursor reset or backward movement is permitted by this contract.

## Acceptance
A9 is VERIFIED only when:
1. unit/adversarial tests pass;
2. CI Tests, Security/Regression and CodeQL pass;
3. live HTTP acquisition succeeds against an explicitly allowlisted public endpoint;
4. checkpoint/restart equivalence is demonstrated;
5. lease loss/cancellation/policy rejection are fail-closed;
6. no A6/A7 authoritative artifact is modified;
7. post-merge exact-HEAD verification and reconciliation are recorded.

## Stop conditions
STOP if:
- target policy cannot be evaluated;
- DNS evidence cannot be obtained;
- lease ownership is ambiguous;
- checkpoint integrity cannot be verified;
- backend result cannot be validated;
- external behavior would require unauthorized mutation;
- evidence authority would be expanded.

## Authorization
This contract authorizes implementation and bounded runtime verification of A9 only. It does not authorize Scrapling, Patchright, Agent-Reach, browser stealth, crawling expansion, or downstream evidence mutation.
