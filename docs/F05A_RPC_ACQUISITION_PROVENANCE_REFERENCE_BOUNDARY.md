# F-05A RPC Acquisition Provenance Reference Boundary

Status: DRAFT / TEST-ONLY

## Purpose
Define a deterministic reference boundary for recording RPC acquisition provenance without changing production evidence or state.

An acquisition record must make the origin and coverage of an RPC observation explicit. Provenance is evidence about acquisition, not proof that the remote source itself is truthful.

## Canonical acquisition input
Required fields:
- protocol
- version
- chain_id
- rpc_source
- method
- request_digest
- response_digest
- from_block
- to_block
- observed_at
- completeness

Numeric block positions are canonical non-negative decimal strings.

request_digest and response_digest are lowercase SHA-256 digests of the exact canonical request/response bytes represented by the acquisition boundary.

rpc_source identifies the configured acquisition endpoint or logical source identity. Secrets, credentials, authorization headers, and private material must never enter the provenance record.

## Completeness
Completeness is explicit and fail-closed:
- COMPLETE — requested range was acquired successfully and the acquisition boundary has no known gaps.
- PARTIAL — only part of the requested range was acquired.
- FAILED — acquisition failed before a complete result was obtained.
- UNKNOWN — completeness cannot be established.

A PARTIAL, FAILED, or UNKNOWN acquisition must not be silently promoted to COMPLETE.

## Determinism
Acquisition identity must be reproducible from canonical acquisition inputs.
It must not depend on random IDs, local filesystem paths, process IDs, mutable runtime state, or wall-clock values not explicitly represented by observed_at.

## Failure preservation
RPC timeout, malformed response, chain mismatch, and range-gap conditions must remain observable. Recovery may retry, but retry must not erase the failed acquisition history.

## Boundary invariants
1. Chain identity is explicit.
2. RPC source identity is explicit.
3. Method and request are bound to the acquisition.
4. Response is bound to the acquisition.
5. Requested block range is explicit.
6. Completeness is explicit.
7. Failure cannot silently become success.
8. Provenance does not authorize cursor advancement.
9. Acquisition provenance does not overwrite raw evidence.
10. Production evidence/state is not modified by this reference boundary.

## Scope limitation
This artifact defines the reference contract only. It does not yet prove live RPC completeness, provider correctness, production acquisition persistence, or V4 authority cutover.