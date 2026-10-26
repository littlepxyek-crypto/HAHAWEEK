# Event Schema

## Source events

One `eth_getLogs` filter on the Uniswap v4 PoolManager
(`0x8366a39cc670b4001a1121b8f6a443a643e40951`, chain `4663`) for three topics:

| Event | Topic constant |
|---|---|
| `Initialize` | `TOPIC0` in `src/core/initialize-decoder.js` |
| `ModifyLiquidity` | `MODIFY_LIQUIDITY_TOPIC` in `src/core/liquidity-event.js` |
| `Swap` | `SWAP_TOPIC0` in `src/core/swap-event.js` |

## Raw event record (`raw-events.jsonl` line / `raw_events` row)

| Field | Notes |
|---|---|
| `event_id` | `chainId:blockNumber:transactionHash:logIndex` (`raw-store.js` `eventId`). |
| `chain_id`, `block_number`, `block_hash`, `transaction_hash`, `transaction_index`, `log_index` | From the RPC log. |
| `address`, `topics`, `data` | Log payload, unmodified. |
| `captured_at` | ISO time of capture (not part of the digest). |

Digest: SHA-256 of the JSON of every field except `event_id` and `captured_at`
(`src/core/raw-event-digest.js`). Re-ingesting the same `event_id` with the same digest is
idempotent; a different digest (for example a changed `block_hash` after a reorg) raises
`INTEGRITY_CONFLICT` and stops ingestion.

Note: the CI scripts under `scripts/hfi-*` use a different raw ID scheme (`raw:v1:<digest>`),
so their outputs cannot be joined to the live database.
