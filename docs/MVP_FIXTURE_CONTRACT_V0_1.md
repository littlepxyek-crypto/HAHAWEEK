# HAHAWEEK — MVP Fixture Contract v0.1

Status: VERIFIED / FROZEN
Verification: STEP 434 focused fixture-contract verification; PR #78 merged and required Security & Regression #993 succeeded.
Step: 433
Scope: MVP Phase 1 — deterministic Pool Bootstrap fixtures

## Purpose

Define a deterministic fixture boundary for testing the MVP Pool Bootstrap vertical slice before replaying authoritative real blockchain evidence.

Fixtures are test inputs only. A synthetic fixture MUST NOT be represented as real blockchain evidence.

## Fixture classes

- SYNTHETIC — deliberately constructed test data; never authoritative.
- DISCOVERY_ONLY — explorer/indexer-derived candidate data; never authoritative raw evidence.
- AUTHORITATIVE — preserved raw RPC response from the target chain; required for the real historical replay phase.

Step 433 establishes SYNTHETIC fixtures only.

## Required metadata

Each fixture MUST declare:

- fixture_id
- fixture_schema_version
- fixture_class
- chain_id
- formation_type
- expected_state
- events

For SYNTHETIC fixtures, provenance MUST explicitly identify the fixture as non-authoritative.

## Event contract

Each event contains:

- event_type
- evidence_id
- chain_id
- pool_id
- block_number
- transaction_index
- log_index

Optional event_time may be supplied for temporal tests.

Allowed event types:

- POOL_CREATED
- LIQUIDITY_ADDED
- SWAP

FIRST_SWAP is derived by the Formation Engine and is not an input event type.

## Required vectors

The Phase 1 minimum set is:

- positive valid Pool Bootstrap
- missing first swap
- liquidity before pool creation
- swap before liquidity
- mixed pool contexts

Expected results MUST be explicit.

## Authority boundary

A fixture replay MUST NOT:

- advance the acquisition cursor;
- commit authoritative evidence;
- modify raw evidence;
- overwrite evidence;
- be treated as a blockchain observation.

A synthetic fixture can prove deterministic software behavior, but it cannot satisfy AC-01 by itself.

## Acceptance

1. Fixture schema is explicit.
2. Fixture class is explicit.
3. Positive and negative vectors are deterministic.
4. Expected Formation Engine states are explicit.
5. Synthetic data cannot be confused with authoritative evidence.
6. Real blockchain evidence remains a separate Phase 2 requirement.
