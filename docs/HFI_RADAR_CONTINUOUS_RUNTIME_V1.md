# HFI-RADAR Continuous Runtime v1

## Status

IMPLEMENTED — RUNTIME VERIFICATION PENDING

## Purpose

Provide a continuous Mainnet observation loop for HFI-RADAR without creating a parallel evidence acquisition path.

The runtime is a supervisor above the existing HAHAWEEK ingestion/authority path:

BLOCKCHAIN / RPC
→ HAHAWEEK ACQUISITION
→ CANONICAL EVIDENCE
→ HFI-RADAR DERIVED CANDIDATE PROJECTION

## Guarantees

- chain is the existing HAHAWEEK Robinhood Mainnet path (chain ID 4663);
- radar semantics consume only canonical evidence IDs from a verified processing context;
- no direct radar getLogs acquisition path is introduced;
- candidate identity uses the existing HFI-RADAR candidate contract;
- duplicate evidence is idempotent;
- derived state is separate from V4 authority state;
- REORG_REPLACEMENT removes derived events in the replaced block range before recomputation;
- runtime state is atomically persisted;
- RPC/runtime failure backs off and retries without advancing authority state itself;
- SIGINT/SIGTERM stops the loop without mutating evidence authority.

## Runtime modes

The command supports bounded verification with:

- HFI_RADAR_MAX_CYCLES
- HFI_RADAR_INTERVAL_MS
- HFI_RADAR_MAX_BACKOFF_MS

With HFI_RADAR_MAX_CYCLES unset, the supervisor is continuous until stopped or an unrecoverable process failure occurs.

## Important boundary

This runtime establishes continuous candidate observation. It does not authorize V4 production authority activation, autonomous trading, publication, prediction, or hidden scoring.

## Verification required

A phase is not VERIFIED until CI tests, negative tests, bounded Mainnet runtime verification, restart/recovery verification, and reconciliation are complete.
