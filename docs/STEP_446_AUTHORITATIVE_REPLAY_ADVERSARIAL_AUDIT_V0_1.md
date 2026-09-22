# STEP 446 — Authoritative Replay Adversarial Boundary Audit v0.1

Status: IMPLEMENTATION CANDIDATE
Step: 446
Base: main at `4bb6e4ac76b9033e687f0bd40276ceef197c6941`

## Purpose

Audit the frozen AUTHORITATIVE evidence envelope and replay boundary for malformed-but-present provenance values that could cross the boundary without representing valid preserved evidence.

## Audit scope

Review the frozen contracts and executable boundaries for:

- AUTHORITATIVE-only enforcement;
- required request provenance;
- preserved response payload;
- observation and capture provenance;
- derived event presence;
- input immutability;
- replay authority isolation;
- deterministic Formation input.

## Adversarial cases

The audit specifically targets:

1. `request.params` property present but `undefined`;
2. `capture.captured_at` present but `undefined`;
3. `response_payload` explicitly `undefined`;
4. empty derived event set;
5. non-AUTHORITATIVE evidence class;
6. deterministic replay after rejection cases.

## Required result

Malformed-but-present provenance MUST NOT be accepted merely because a property exists. The frozen boundary must require usable values for fields whose presence is part of authoritative provenance.

## Safety

This is an adversarial validation step only. It does not change Formation semantics, live RPC ingestion, cursor authority, raw-store authority, V4 production authority, predictive scoring, trading, or signing.

Design Gate 2 remains OPEN.
Production V4 remains NOT AUTHORIZED.
