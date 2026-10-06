# HAHAWEEK — CLAIM PROMOTION PROVENANCE CONTRACT V1

Status: IMPLEMENTED / VERIFIED — exact PR-head E5 runtime

## Purpose

Define the executable boundary for promoting a traced research claim into a derived research-claim artifact.

Promotion here is a DERIVED ANALYTICAL operation. It does not promote a claim into canonical evidence, evidence authority, V4 authority, or external truth.

## Required provenance

A promotable claim MUST contain:
- claim_id
- statement
- evidence_ids
- research_report_id
- provenance_reference
- claim_rule_version

`evidence_ids` MUST be non-empty unique strings.
`provenance_reference` MUST contain the report identifier and source evidence identifiers.

Every claim evidence ID MUST be present in the research report evidence set.

## Promotion boundary

The resulting artifact is `RESEARCH_CLAIM` only.

It MUST NOT:
- become canonical evidence;
- become V4 authority;
- mutate raw or canonical evidence;
- mutate cursor, checkpoint, manifest, canonicality, or authority state;
- promote identity;
- bypass validation;
- become an independent source;
- authorize publication or trading.

An Agent may draft or request promotion, but the promotion function itself is deterministic and evidence-bound; Agent intent cannot bypass validation or provenance.

## Validation requirement

A claim may be promoted only when the linked research report contains an allowed validation result:
- CONFIRMED
- REJECTED
- INCONCLUSIVE

`UNKNOWN` is retained as a non-promotable state for this contract.

`INCONCLUSIVE` remains INCONCLUSIVE and is never converted to success or failure.

## Determinism

Identical claim, report, evidence set, provenance, and rule version MUST produce identical promotion identity.

## Acceptance

CONTRACT → IMPLEMENTATION → POSITIVE TEST → NEGATIVE TEST → RUNTIME VERIFICATION → DOCUMENTATION → RECONCILIATION