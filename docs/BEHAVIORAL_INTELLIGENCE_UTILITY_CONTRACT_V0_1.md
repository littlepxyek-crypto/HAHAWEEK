# HAHAWEEK — BEHAVIORAL INTELLIGENCE UTILITY CONTRACT V0.1

Status: IMPLEMENTATION CANDIDATE

## Purpose

Define a deterministic, read-only behavioral analysis utility over authoritative
HAHAWEEK evidence and derived observations.

The utility is a consumer of evidence. It is not an evidence authority.

## Scope

V0.1 covers:

- deployer behavioral fingerprint;
- wallet relationship clustering;
- fund-flow graph projection;
- temporal coordination observations.

The utility MUST NOT implement:

- social/X/Telegram/Discord scraping;
- autonomous alerts or external publication;
- trading/signing;
- arbitrary risk scores or rankings;
- ownership assertions;
- L4/L5 identity promotion;
- mutation of canonical evidence;
- mutation of V4 authority;
- cursor/checkpoint/manifest mutation;
- arbitrary SQL;
- direct persistence access.

Protocol-specific Pons analysis remains an adapter boundary for a later step.

## Input Boundary

Inputs are already-acquired observations. Each observation MUST carry evidence
references. The utility MUST NOT treat missing observations as negative evidence.

Every evidence reference MUST be supplied through an explicit admission set.
Unresolved references are rejected.

Temporal inputs MUST preserve event time and may include an explicit as-of
cutoff. Future observations relative to the cutoff are rejected.

## Output Boundary

Outputs are derived behavioral findings and projections.

A finding contains:

- deterministic finding identity;
- subject entity;
- finding type;
- observation status;
- evidence references;
- temporal scope;
- rule/algorithm version;
- categorical confidence;
- explicit uncertainty;
- methodology.

No numeric risk score is produced.

A behavioral similarity or coordination finding MUST NOT be represented as proof
of common ownership or malicious intent.

## Determinism

For identical:

- admitted evidence;
- observations;
- temporal cutoff;
- rule version;
- algorithm version;

the same byte-equivalent derived output MUST be produced.

Wall-clock generation timestamps MUST NOT participate in derived identity.

## Uncertainty

The utility distinguishes:

- OBSERVED
- DERIVED
- INFERRED
- UNKNOWN
- INCONCLUSIVE

Incomplete acquisition never becomes a negative behavioral conclusion.

## Reorg Boundary

Behavioral projections are rebuildable.

If upstream canonical evidence is invalidated, affected behavioral projections
MUST be considered stale and rebuilt by the analytical reorg lifecycle.

The utility does not decide canonicality and does not preserve stale findings.

## Authority Boundary

The authority chain remains:

RAW
→ CANONICAL
→ EVIDENCE AUTHORITY
→ BEHAVIORAL PROJECTION

The behavioral utility cannot promote a derived finding to evidence authority.

## Acceptance

CONTRACT
→ IMPLEMENTATION
→ POSITIVE TEST
→ NEGATIVE TEST
→ RUNTIME/CI VERIFICATION
→ RECONCILIATION

Until those stages pass, this contract remains an implementation candidate.
