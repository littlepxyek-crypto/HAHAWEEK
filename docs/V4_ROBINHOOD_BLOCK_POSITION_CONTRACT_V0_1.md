# HAHAWEEK — Robinhood Block Acquisition Position Contract V0.1

## Status

NORMATIVE — ACQUISITION BOUNDARY ONLY

This contract defines the acquisition-specific meaning of the V4 cursor `position` for the current Robinhood Chain block-range ingestion path.

It does not authorize V4 production cutover by itself.

## 1. Acquisition model

The production ingestion path acquires blockchain data by inclusive block-number ranges.

The acquisition provider exposes a chain head through `getBlockNumber()`, and `IngestionEngine` advances sequentially through integer block numbers.

Therefore, for this acquisition path:

`cursor.position = block_number`

The mapping is exact and lossless.

## 2. Position encoding

The V4 cursor contract stores `position` as a canonical unsigned-64-bit decimal string.

For this acquisition contract, the corresponding acquisition coordinate is the same integer represented as a JavaScript-safe ingestion block coordinate.

The mapping MUST satisfy:

- canonical cursor position `P` maps to acquisition block `P`;
- no offset is added or removed;
- no timestamp, transaction index, log index, RPC pagination token, or array index may substitute for the block number;
- no implicit coercion or normalization is permitted at the authority boundary;
- a negative or non-integer acquisition block is invalid.

## 3. Resume semantics

If an authoritative cursor contains:

`position = P`

the next sequential acquisition position is:

`P + 1`

subject to the normal confirmation/safe-head boundary.

A restart MUST therefore resume from `P + 1`, not from an inferred timestamp, latest head, or legacy cursor.

## 4. Boundary validation

Before V4 cursor advancement, the target acquisition position MUST be the exact block number successfully processed by the current ingestion transaction.

The following are invalid:

- target position lower than the current authoritative position;
- target position not an integer block number;
- target position represented by a different acquisition coordinate;
- cursor position and processed block number disagree;
- an acquisition position that cannot be deterministically mapped to a block number.

## 5. Reorganizations

This contract defines only the progress coordinate. It does not define canonical-chain/reorg authority.

Reorg handling remains governed by the applicable evidence, segment, manifest, checkpoint, and acquisition/reorg contracts.

A block number alone does not establish canonicality.

## 6. Legacy boundary

Legacy `BlockCursor` and `state.json` are not converted or imported by this contract.

A V4 cursor position is authoritative only through the verified V4 authority chain.

No fallback from failed V4 recovery to legacy progress is permitted.

## 7. Scope

This contract freezes only the mapping:

`V4 cursor.position ↔ Robinhood Chain block_number`

It does not:

- enable V4 in `src/index.js`;
- change RPC acquisition;
- change historical evidence;
- define manifest/segment semantics;
- define checkpoint semantics;
- authorize migration;
- authorize trading or execution.

## 8. Required tests

The production integration test suite MUST demonstrate:

1. persisted position 900 resumes at block 901;
2. successful processing of block 901 persists position 901;
3. restart resumes at block 902;
4. a mismatched/non-block acquisition coordinate is rejected;
5. cursor regression is rejected;
6. failed V4 authority recovery never falls back to legacy progress.

## 9. F-03 relationship

This contract closes the previously unspecified acquisition-specific position mapping for the current block-range ingestion path.

F-03 remains open until the complete production `createEngine()` path is wired to persisted V4 authority and the full closure matrix passes.
