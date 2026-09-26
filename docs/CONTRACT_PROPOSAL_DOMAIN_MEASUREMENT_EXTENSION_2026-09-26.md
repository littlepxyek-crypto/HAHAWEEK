# HAHAWEEK — Contract Proposal — Domain Measurement Extension

Status: CONTRACT PROPOSAL — NOT AUTHORIZED / NOT A NUMBERED STEP
Date: 2026-09-26

## 1. Purpose

Resolve the post-STEP-611 authorization boundary by preparing a candidate scope that is already grounded in an existing frozen domain-measurement boundary.

This proposal does NOT establish or number a new STEP, does NOT authorize implementation, and does NOT change PROJECT_STATE.md.

## 2. Evidence Basis

The existing STEP 610 Domain Measurement Evidence Boundaries Contract explicitly permits domain-specific derived observations for liquidity/depth, including price impact/slippage, when calculation inputs and assumptions are preserved.

The same contract requires all measurements to remain derived, evidence-linked, versioned, deterministic, and non-authoritative.

The current PROJECT_STATE.md states that no numbered Next STEP is established and that the next STEP must be established through a new Contract.

Therefore this proposal selects an existing, explicitly bounded capability as a candidate; it does not infer authorization from the historical contract.

## 3. Candidate Scope

Candidate domain: price impact / slippage measurement.

Potential output:
- versioned surveillance observation;
- explicit entity/pool/asset references;
- evidence references;
- event/observation/processing times;
- calculation/rule version;
- validation state;
- uncertainty;
- deterministic identity;
- preserved calculation inputs and assumptions.

## 4. Mandatory Boundaries

The candidate implementation MUST NOT:

- mutate raw/canonical evidence;
- become source of truth;
- advance or reset acquisition cursors;
- modify V4 authority;
- create trading/execution authority;
- submit transactions;
- infer actor identity or real-world ownership;
- silently overwrite historical observations;
- use an undeclared AMM/depth model;
- claim execution guarantees;
- silently normalize missing or conflicting evidence.

Unsupported or insufficient inputs MUST remain UNKNOWN/INCONCLUSIVE/UNVERIFIED according to the applicable versioned validation vocabulary.

## 5. Operator Acceptance

If authorized, the eventual lifecycle MUST define reproducible operator behavior for:
setup/run, health/status, output/evidence interpretation, failure recognition, recovery, recovery verification, evidence/cursor preservation, and STOP/FAIL-CLOSED behavior.

No command or operational procedure is invented by this proposal.

## 6. Surveillance Boundary

The capability remains derived, evidence-linked, versioned, deterministic, and non-authoritative.

ADDRESS != ACTOR.

No scoring, risk authority, automated action, trading, deanonymization, or production authority is included.

## 7. Required Contract Decision

Before any implementation, a new Contract must explicitly freeze:

1. exact calculation model(s);
2. required input evidence;
3. supported pool/AMM models;
4. units and rounding rules;
5. temporal constraints;
6. validation/uncertainty states;
7. deterministic identity;
8. reorg/version behavior;
9. conflict handling;
10. acceptance criteria;
11. Operator Acceptance criteria;
12. Security/Regression requirements;
13. CI and verification evidence;
14. explicit out-of-scope items.

## 8. Gate / Authority

No Gate 2 production activation is authorized by this proposal.

No production implementation is authorized by this proposal.

Authorization requires an explicit new Contract and the full mandatory lifecycle.

## 9. Preservation

Historical STEP 610 and STEP 611 artifacts remain immutable.

This proposal is additive coordination evidence only.
