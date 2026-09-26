# HAHAWEEK — Domain Measurement Extension Contract
## Price Impact / Slippage — Contract v0.1

Status: CONTRACT — AUTHORIZED
Authorization: explicit user authorization received 2026-09-26
Purpose: freeze the scope and technical boundary for a derived price-impact/slippage measurement extension before Analysis.

## 1. Scope

This Contract authorizes investigation and implementation of a deterministic, evidence-linked, versioned derived observation for price impact and/or slippage, using only explicitly supported pool/AMM models and preserved calculation inputs/assumptions.

This Contract does not authorize V4 production activation, trading, transaction submission, automated action, scoring/risk authority, or any change to raw/canonical evidence authority.

## 2. Required output

Each supported measurement MUST preserve:
- explicit entity/pool/asset references;
- evidence references;
- event_time, observation_time, processing_time;
- calculation/rule version;
- validation state;
- uncertainty;
- deterministic identity;
- calculation inputs and assumptions sufficient for deterministic reproduction.

Temporal invariant:
event_time <= observation_time <= processing_time.

## 3. Evidence and validation

Measurements MUST be derived from admitted evidence and MUST fail closed when required evidence or model assumptions are absent, conflicting, unsupported, or unverifiable.

Allowed validation vocabulary remains versioned and explicit; unsupported cases MUST remain UNKNOWN, INCONCLUSIVE, UNVERIFIED, or CONFLICTING as applicable.

No latest-wins conflict resolution. No silent normalization.

## 4. Calculation-model boundary

Analysis MUST identify and freeze before implementation:
1. supported AMM/pool model(s);
2. price convention;
3. quote/base direction;
4. required reserve/liquidity and trade inputs;
5. exact mathematical definition of price impact and slippage;
6. units, precision, rounding, and zero/invalid-input handling;
7. evidence requirements and provenance;
8. deterministic identity inputs;
9. reorg/version behavior;
10. conflict handling.

No generic constant-product fallback may be used unless that model is explicitly supported and frozen by the Contract/Design.

No execution guarantee may be inferred from a derived measurement.

## 5. Historical and integrity boundaries

The implementation MUST NOT:
- mutate raw/canonical evidence;
- delete or rewrite historical observations;
- reset or advance acquisition cursors;
- change V4 authority;
- silently overwrite observations;
- alter frozen historical Contracts;
- create production execution authority.

Reorgs MUST preserve prior observations and produce versioned derived observations from newly admitted evidence; no cursor reset.

## 6. Surveillance boundary

The capability is derived, evidence-linked, versioned, deterministic, reproducible, and non-authoritative.

ADDRESS != ACTOR.

No actor/ownership inference, deanonymization, automated action, trading, or production authority is authorized.

Scoring/risk is out of scope for this Contract.

## 7. Operator Acceptance

Before this Contract can be considered complete, the lifecycle MUST establish reproducible operator behavior for:
setup/run, health/status, output/evidence interpretation, failure recognition, recovery, recovery verification, evidence/cursor preservation, and STOP/FAIL-CLOSED behavior.

No command is invented here; operator procedures must be grounded in verified repository interfaces.

## 8. Acceptance criteria

The eventual implementation is acceptable only if:
- supported model(s) and formula are explicitly frozen;
- required evidence and assumptions are preserved;
- deterministic reproduction is demonstrated;
- unsupported/insufficient evidence fails closed;
- temporal and validation rules are enforced;
- reorg/version behavior is preserved;
- raw/canonical evidence, cursor, V4 authority, and production semantics remain unchanged;
- regression/security coverage is demonstrated;
- CI and post-merge verification provide evidence;
- reconciliation and final documentation record the complete traceability chain.

## 9. Explicit out-of-scope

- V4 production activation;
- Gate 2 PASS declaration;
- trading or transaction execution;
- transaction submission;
- automated action;
- price prediction;
- scoring/risk authority;
- actor/ownership inference;
- deanonymization;
- mutation of raw/canonical evidence;
- cursor reset/advancement;
- new production authority;
- undeclared AMM/pool models;
- silent normalization or latest-wins conflict handling.

## 10. Mandatory lifecycle

After Contract acceptance, the work proceeds strictly:
Contract -> Analysis -> Design -> Code -> Test -> Security/Regression -> CI -> Review -> Merge -> Verification -> Reconciliation -> Documentation -> Next STEP.

No phase may be skipped or treated as complete without evidence.

## 11. Historical preservation

STEP 610 and STEP 611 artifacts remain immutable. This Contract is additive and does not rewrite historical metadata.

## 12. Numbering and state authority

This authorization establishes the Contract scope. The next numbered STEP identifier MUST be established by the reconciled Contract/state artifacts rather than inferred from stale documents. Until reconciliation establishes the current numbered STEP, no implementation phase may be treated as authorized.

