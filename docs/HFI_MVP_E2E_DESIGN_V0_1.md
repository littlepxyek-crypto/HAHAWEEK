# HFI-MVP-E2E-V0_1 — DESIGN v0.1

Status: DESIGN — AUTHORIZED
Contract: docs/CONTRACT_HFI_MVP_E2E_V0_1.md
Authority: A0-A5

## Design principles

- Reuse existing authoritative evidence, canonical evidence, identity, integrity, formation, outcome, validation, report, and X projection boundaries.
- Add only the HFI orchestration/runtime verifier and narrowly scoped runtime-evidence boundary hardening.
- Do not rewrite the Evidence Graph merely to add unused node/edge vocabulary.
- Preserve raw blockchain evidence and runtime provenance without mutating authoritative acquisition state.
- Never use processing timestamps in deterministic identities.
- Do not mutate cursor, checkpoint, writer-fence, or production acquisition state from the verifier.
- Runtime verifier is read-only with respect to blockchain and produces derived evidence artifacts.

## Targeted candidate verification mode

The default verifier remains bounded historical discovery. For E5 when the public RPC rate limit makes the broad candidate pass non-reproducible, the verifier may receive `HFI_POOL_ID` plus `HFI_POOL_INIT_BLOCK` as candidate-selection hints.

The targeted path performs an exact `eth_getLogs`-equivalent lookup against the authoritative Robinhood PoolManager at the supplied initialization block and requires exactly one matching `Initialize` log. Formation-event acquisition for the targeted candidate is then chunked into 500-block RPC windows, below the public endpoint's documented/runtimed log-range pressure boundary, while preserving the same inclusive formation search horizon. It then runs the unchanged formation, seven-day outcome, validation, report, graph, integrity, and replay pipeline against evidence acquired from that RPC. The hint itself is never included as evidence, identity, provenance, or validation input.

The initial CI hint is the WETH/USDG V4 pool `0x387bf619da4d3fb62bb276482693dba1b9b3520f573cabdfe033384a24125982` at initialization block `169464`. This is a candidate-selection input only; runtime acceptance depends exclusively on verified chain evidence.

E5 transport may use a verified Robinhood Chain JSON-RPC provider when the official public endpoint is unavailable or rate-limited. The CI fallback is `https://rpc.ordofi.network`; it is used only for read methods. The verifier must still validate chain_id 4663 and preserve the actual RPC URL in runtime evidence. No send, signing, or external mutation method is part of the runtime path.

For the targeted historical candidate, block timestamp reads are batched at up to 25 JSON-RPC calls per transport request. Batching is a transport optimization only: each block lookup remains individually addressable by block number, ethers preserves response-to-request association, and canonical event ordering continues to use block/transaction/log order.

## Vertical slice

1. Query a verified Robinhood Mainnet RPC source for chain_id 4663.
2. Discover a real Pool Manager Initialize event.
3. Verify subsequent positive ModifyLiquidity and Swap events for the same pool.
4. Preserve selected raw logs and their capture metadata as runtime evidence.
5. Convert selected raw logs into existing canonical evidence and deterministic evidence identities.
6. Project authoritative events and formation into the existing Evidence Graph.
7. Create the frozen-compatible Pool Bootstrap Formation Result.
8. Construct a fixed seven-day Historical Outcome from Swap liquidity observations.
9. Evaluate LIQUIDITY_SURVIVAL under the explicit HFI methodology below.
10. Produce Validation Result through the frozen Validation boundary.
11. Produce Research Report and evidence-backed claims.
12. Produce X Content projection only.
13. Replay captured authoritative evidence twice and compare deterministic IDs/results.
14. Emit one JSON runtime evidence artifact with commit provenance and verification results.

## LIQUIDITY_SURVIVAL-HFI-v1

- Methodology version: `liquidity-survival-hfi-v1`.
- Reference: liquidity value carried by the selected FIRST_SWAP event.
- Unit: protocol Pool Manager liquidity units, represented as an unsigned integer string; no token/fiat conversion.
- Start: Formation Result `formation_end` (FIRST_SWAP event time).
- End: start + exactly 7*24 hours.
- Sampling: at least one verified Swap observation for the same pool in every UTC 24-hour bucket.
- Observation value: Swap event liquidity field.
- Survival criterion: `active_liquidity * 10000 >= reference_liquidity * 5000`.
- Coverage: all seven daily buckets required for PASS/FAIL. Missing bucket => INCONCLUSIVE.
- Provider unavailable, incomplete capture, or insufficient historical evidence => INCONCLUSIVE.
- Conflicting authoritative records for the same evidence identity => CONFLICT/FAILED and never silently resolved.
- No-look-ahead: formation is fixed at FIRST_SWAP; outcome evidence must lie inside the fixed post-formation window.

## Event-time and observation-time

- `event_time` comes from verified block timestamp.
- `observation_time` is runtime RPC capture time and is metadata, not formation chronology.
- `processing_time` is verifier execution metadata and does not participate in deterministic identity.
- Formation chronology uses blockchain block/transaction/log ordering and event time only.

## Graph boundary

Reuse existing BLOCK, TRANSACTION, CONTRACT, EVENT, FORMATION and REFERENCES semantics. Every Formation evidence ID must already have an EVENT node. The graph remains deterministic, rebuildable, derived, and non-authoritative.

## Runtime artifact boundary

The runtime artifact is created at startup in RUNNING state and carries `GITHUB_SHA` when available. The workflow removes any pre-existing artifact path before execution and verifies that the persisted artifact commit exactly matches `github.sha` before upload. This prevents a stale artifact from being accepted as E5 evidence for a different commit.

## Replay

The verifier replays the same captured event set through event reconstruction, Formation, Outcome, Validation, and Report. Deterministic IDs and material statuses must match exactly.

## Failure handling

- RPC failure => preserved FAILED/UNAVAILABLE runtime evidence.
- incomplete event set => INCOMPLETE/INCONCLUSIVE.
- conflicting evidence => CONFLICT.
- malformed/corrupt evidence => FAILED.
- no cursor mutation.
- no external publication.
- no signing or transaction execution.

## Verification boundary

Repository CI verifies code/tests. E5 requires actual execution against real RPC and must not be inferred from CI. A runtime artifact whose embedded commit does not equal the executed commit is invalid for post-merge E5 claims.
