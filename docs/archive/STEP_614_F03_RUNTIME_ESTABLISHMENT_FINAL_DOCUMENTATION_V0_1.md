# STEP 614 — F-03 Runtime Authority Establishment — Final Documentation v0.1

Status: VERIFIED / RECONCILED / DOCUMENTED / RUNTIME EVIDENCE PENDING

## Requirement

Provide the smallest authorized runtime boundary that establishes the exact F-03 expected-authority chain from a VERIFIED durable processing context without weakening the existing authority gate.

## Implementation

The implementation re-reads the durable processing result, cryptographically verifies referenced raw/canonical evidence, derives the frozen V4 segment/manifest/checkpoint commitments, creates complete provenance, atomically persists through the existing F-03 mechanism when the exact chain is absent, and re-reads the chain before authority validation continues.

## Failure behavior

Missing or conflicting processing/evidence state, integrity mismatch, range/generation mismatch, writer-fence loss, persistence failure, or ambiguous durable state fails closed. Existing valid chains are verified idempotently rather than rewritten.

## Recovery

Restart reuses the durable VERIFIED processing context and processing result. The establishment layer does not reset history or cursor state.

## Operator procedure

Supported commands remain unchanged: ./bin/hahaweek status, ./bin/hahaweek test, ./bin/hahaweek health, ./bin/hahaweek scan, ./bin/hahaweek start, ./bin/hahaweek repair.

## Limitation

Actual interactive Termux runtime has not been observed through repository tooling. Therefore HAHAWEEK must not yet be declared VERIFIED LIVE.

## Next

Collect actual operator runtime evidence under STEP 614: setup, start, status, health, understandable output, failure diagnosis, recovery, recovery verification, and STOP-condition evidence.