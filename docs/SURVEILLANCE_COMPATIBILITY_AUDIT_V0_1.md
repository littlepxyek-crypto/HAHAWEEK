# Surveillance Compatibility Audit v0.1

## Status
**Analysis-only / non-semantic audit**

This artifact evaluates whether surveillance-style capabilities can be introduced into HAHAWEEK without changing the existing Standing Execution Rule, frozen authority boundaries, historical evidence, or production semantics.

This document does **not** authorize implementation.

## Relationship to STEP 589
Baseline: STEP 589 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design.

STEP 589 remains the active canonical execution sequence. This audit is an auxiliary compatibility artifact and does not redefine the next STEP.

## Standing Execution Rule — preserved
The existing sequence remains unchanged:

Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.

No surveillance capability may bypass that sequence.

For this audit, only **Analysis** is performed. No production code, schema, cursor, authority semantics, raw evidence, V4 activation state, or frozen STEP semantics are changed.

## Compatibility matrix

| Capability | Existing HAHAWEEK substrate | Compatibility | Gap / constraint | Implementation authority |
|---|---|---|---|---|
| Evidence acquisition | RPC/acquisition + raw evidence | HIGH | Must preserve exact bytes/provenance | Existing evidence contracts |
| Transaction/event reconstruction | Evidence Graph + canonical evidence | HIGH | Graph remains projection only | Evidence Graph contracts |
| Temporal behavior reconstruction | Formation/time/lineage contracts | HIGH | No future-data leakage | Temporal/formation contracts |
| Wallet/address observation | WALLET graph node + identity contracts | MEDIUM | Address != actor; identity must remain evidence-backed | Identity Resolution |
| Entity/actor clustering | Identity Resolution L4/L5 | MEDIUM | No unsupported ownership/control inference | Identity contracts |
| Funding-flow tracing | Transaction/evidence graph + lineage | MEDIUM | Requires explicit relationship semantics and provenance | New analysis contract if needed |
| Behavioral fingerprinting | Partial substrate | LOW/MEDIUM | Needs versioned feature definitions and evidence references | New derived-analysis contract |
| Cross-wallet coordination | Partial substrate | LOW/MEDIUM | Cannot equate address diversity with actor diversity | New validation/analysis contract |
| Cross-chain entity linkage | Not established as authoritative | LOW | Requires source and identity boundary | New contract required |
| Suspicious-pattern detection | Validation/formation substrate | LOW/MEDIUM | Detection must remain explainable and evidence-linked | New analysis + validation contract |
| Risk/scoring | Validation framework exists | LOW | No predictive score without validated definitions/outcomes | New versioned validation contract |
| Alerting | Derived outputs possible | MEDIUM | Alert must cite evidence and uncertainty | Output contract |
| Automated action | Explicitly outside foundation | NONE | Trading/signing/action execution prohibited by current architecture | Not in scope |

## Core findings

### 1. Surveillance is compatible as a derived research/analysis capability
The strongest compatibility exists where surveillance means reconstructing observed behavior; connecting evidence across time; identifying relationships between already-observed entities; preserving provenance; exposing contradictions and uncertainty; and producing reproducible analytical outputs.

This fits HAHAWEEK's evidence-first model.

### 2. Surveillance must not become a new source of truth
The Evidence Graph is explicitly rebuildable and non-authoritative.

Therefore the dependency must remain: AUTHORITATIVE EVIDENCE → DERIVED SURVEILLANCE ANALYSIS.

### 3. Identity is the primary safety boundary
A wallet/address may be observed.

An actor, owner, controller, bot operator, or coordinated group may only be inferred when the applicable identity contract and evidence support that inference.

The system must preserve the distinction:

ADDRESS ≠ ACTOR

and:

MULTIPLE ADDRESSES ≠ MULTIPLE ACTORS

### 4. Temporal leakage must remain prohibited
Any surveillance detector intended for historical evaluation must freeze its input horizon.

Evidence that becomes available after the formation/detection boundary cannot silently influence the historical detection result.

### 5. A score would require a separate contract
A surveillance score should not be added merely because the underlying graph exists.

Before implementation, the project would need feature definitions; observation windows; missing-data semantics; uncertainty semantics; deterministic calculation rules; validation population; outcome definition; versioning; and reproducible evidence references.

Until then, the output should remain descriptive/derived rather than a predictive authority.

## Minimal safe future architecture

AUTHORITATIVE EVIDENCE
        ↓
REBUILDABLE GRAPH / LINEAGE
        ↓
VERSIONED DERIVED OBSERVATIONS
        ↓
BEHAVIORAL RELATIONSHIPS
        ↓
VALIDATION
        ↓
SURVEILLANCE REPORT / ALERT

The surveillance layer must remain downstream of authoritative evidence.

## Explicit non-goals
This audit does not authorize trading; buying/selling recommendations; private-key use; transaction signing; automatic intervention; black-box risk scores; unsupported actor attribution; retroactive modification of historical evidence; cursor advancement; authority promotion; or V4 production activation.

## Decision gate
**Result: COMPATIBLE WITH CONDITIONS**

The concept is compatible with HAHAWEEK only as a derived, evidence-linked, versioned analytical capability.

It is not compatible with HAHAWEEK if introduced by changing the Standing Execution Rule; bypassing existing contracts; making the graph authoritative; treating identity inference as fact; introducing unvalidated predictive scores; modifying historical evidence; or bypassing CI/review/reconciliation.

## Required next action
No implementation is authorized by this audit.

If the project later chooses to implement surveillance capability, the next work must first define the exact analytical boundary and contract, then proceed through the existing Standing Execution Rule in order.

## Reconciliation note
This audit is intentionally isolated from production runtime semantics. It should be merged only as documentation if repository CI/review requirements are satisfied. It must not be treated as a new canonical STEP or as permission to skip the current STEP 589 sequence.