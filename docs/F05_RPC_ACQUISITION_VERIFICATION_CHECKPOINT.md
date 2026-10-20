# F-05 RPC Acquisition Provenance Verification Checkpoint

Status: VERIFIED AT TEST BOUNDARY — DESIGN GATE 2 REMAINS OPEN

## Scope

This checkpoint records verification of the F-05 RPC acquisition provenance reference boundary. It does not authorize production V4 activation or production acquisition cutover.

## Verified components

### F-05A — Reference boundary

Defined explicit acquisition provenance for:

- protocol and version
- chain identity
- RPC source identity
- RPC method
- request digest
- response digest
- requested block range
- observation time
- completeness state

Completeness states are explicit:

- COMPLETE
- PARTIAL
- FAILED
- UNKNOWN

Non-complete states cannot be silently represented as COMPLETE.

### F-05B — Acquisition verifier

Commit: 6c87d731e339844ec22979a709294c47191b3616

GitHub Actions run: #585

Result: PASS

Verified:

- deterministic acquisition identity
- deterministic canonical input independent of key order
- explicit completeness states
- invalid block ranges rejected
- malformed digests rejected
- unknown completeness rejected
- unknown fields rejected
- evidence mutation changes identity
- verifier does not mutate input

### F-05C — Completeness and failure boundary

Commit: 396afe6bfa7d91b17dda093dcfd0481df6a919a4

GitHub Actions run: #587

Result: PASS

Verified:

- PARTIAL remains PARTIAL
- FAILED remains FAILED
- UNKNOWN remains UNKNOWN
- chain identity changes alter acquisition identity
- block-range changes alter acquisition identity
- RPC source changes alter acquisition identity
- acquisition timestamp changes alter acquisition identity

## Verification result

F-05A: VERIFIED AT REFERENCE BOUNDARY

F-05B: VERIFIED AT TEST BOUNDARY

F-05C: VERIFIED AT TEST BOUNDARY

## Limitations

This checkpoint does not prove:

- live provider correctness
- exhaustive live RPC range completeness
- production acquisition persistence
- production RPC failover semantics
- final V4 checkpoint/manifest authority
- overall Design Gate 2 completion

The reference boundary is intentionally provider-independent.

No production evidence or state is modified by this checkpoint.

## Gate status

Design Gate 2 remains OPEN / NOT PASSED.

Production V4 activation remains NOT AUTHORIZED.

The next work should address the remaining Design Gate 2 blockers rather than expanding product features.
