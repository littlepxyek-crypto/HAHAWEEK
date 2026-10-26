# STEP 566 — Durable Processing-Result / Generation Persistence Contract v0.1

Status: CONTRACT
Predecessor: STEP 565
Gate 2: PASS
V4 production activation: INACTIVE

## Purpose

Define the smallest durable, immutable persistence boundary that can supply STEP 564 with an authoritative processing-result context without manufacturing generation or reusing expected authority.

## Persistence model

A processing result is an immutable accepted canonical processing record.

Required logical record fields: result_id; from_block; to_block; generation; status; canonicality_status; empty_result; evidence_set_digest; processing_execution_id; parent_result_id; transition_type; committed_at; provenance.

Accepted result membership MUST be durable through a child membership relation containing result_id, ordinal, evidence_id, raw_event_id, identity_hash, raw_hash, canonical_hash, block_number, transaction_index, and log_index. Membership is immutable after result acceptance.

## Generation authority

Generation originates from canonical processing lineage.

- First accepted lineage MAY use an explicitly supplied generation.
- Continuation MUST preserve the supplied generation unless canonical processing explicitly establishes a new lineage.
- Reorg replacement MUST create a new processing result and receive an explicitly supplied new generation.
- Persistence MUST never increment, hash, timestamp, randomize, truncate, or default generation.
- Generation MUST NOT come from cursor, expected authority, checkpoint digest, writer fence, or wall clock.

## Exact range and evidence membership

from_block MUST be less than or equal to to_block. Every accepted result and membership row MUST correspond exactly to the result range. No outside-range evidence is allowed.

For an accepted result: every evidence_id MUST exist in canonical_evidence; raw_event_id MUST match; identity/hash fields MUST match canonical_evidence and linked raw_events; transaction_index MUST be present; membership ordering MUST be the STEP 563 deterministic order; duplicate authority keys MUST be rejected; reorg-invalid evidence MUST be rejected; missing or ambiguous membership MUST fail closed.

empty_result=true is valid only when explicitly committed with deterministic empty-result semantics.

## Immutability and conflict handling

Identical replay is idempotent. Same result_id with different content is an integrity conflict. Same processing_execution_id cannot silently produce conflicting accepted results. Accepted membership cannot be updated or deleted. Replacement is a new result and lineage, never mutation of the old result.

## Durability / transaction ordering

Implementation MUST atomically validate input, validate canonical evidence and lineage, verify existing writer ownership, write result plus membership in one transaction, and commit durable state. STEP 564 may consume the context only after successful durable commit. Failed transactions leave prior durable state unchanged.

## Recovery

Committed results remain readable after restart. Incomplete transactions are absent. Replay of the same processing execution and canonical input is byte-equivalent. No new generation is manufactured. Old accepted results remain historical evidence.

## Reorg

A reorg replacement MUST NOT mutate or delete the prior accepted result. It MUST create a new result, identify the prior lineage, receive a new generation from canonical processing, and reject invalidated evidence.

## Concurrency

Use the existing single-writer fence. Loss of ownership before commit MUST fail closed. A second writer must not create a conflicting accepted result for the same processing execution or lineage boundary.

## Schema boundary

Implementation may require an additive migration from schema version 4. Such migration must be transactional and separately implemented/tested. STEP 566 contract stage does not modify the existing schema.

## Non-goals

No submitted authority producer, expected-authority read, cursor advancement, V4 activation, historical rewrite/deletion, or RPC/provider behavior change.

## Acceptance criteria

1. Immutable processing-result fields are frozen.
2. Generation authority and transition semantics are frozen.
3. Exact evidence membership and ordering are frozen.
4. Idempotence/conflict semantics are frozen.
5. Transaction, recovery, reorg, and concurrency boundaries are frozen.
6. Existing schema remains unchanged in this contract step.
7. STEP 564 can consume this context without semantic invention.
