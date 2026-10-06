# HAHAWEEK — DESCRIPTIVE MEASUREMENT BOUNDARY CONTRACT v1

Status: IMPLEMENTED / VERIFIED — dedicated exact-PR-head CI runtime

## Purpose

A descriptive measurement records an observed or derived quantity without
silently turning that quantity into a ranking, predictive score, or trading
instruction.

This contract is an analytical boundary. It does not mutate V4 evidence
authority and does not authorize publication or trading behavior.

## Required fields

Every measurement MUST contain:

- measurement_id
- measurement_rule_version
- metric_name
- value
- unit
- evidence_ids
- measurement_time

Optional:

- source_kind
- observation_window
- provenance_reference

value MUST be a finite number. measurement_time MUST be a valid timestamp.
Every evidence id MUST be a non-empty string.

## Semantic boundary

A measurement is descriptive when:

- its metric name describes a measurable property;
- its value is the measured quantity;
- its unit identifies the quantity's meaning;
- its evidence lineage is explicit;
- its rule version is explicit.

The contract MUST reject attempts to encode a descriptive measurement as:

- a predictive score;
- a ranking;
- a BUY/SELL instruction;
- an autonomous trading decision.

Reserved decision fields include score, rank, ranking, prediction, signal,
recommendation, action, buy_sell, and trading_decision.

A consumer MAY derive additional analytics from measurements only through a
separately versioned and explicitly authorized contract.

## Authority

Descriptive measurements are derived analytical state.

They MUST NOT rewrite canonical evidence, mutate V4 identity/transitions,
advance the V4 cursor, establish canonicality, or activate production
authority.

## Determinism

For the same measurement input and contract version, the canonical output
and measurement identity MUST be deterministic.
