# STEP 614 — F-03 Runtime Authority Establishment — Design v0.1

Status: VERIFIED DESIGN / CODE AUTHORIZED
Baseline: d0f33bd6b7c947dad7a553a3a7d3e08f55fa2863
Contract Amendment: docs/STEP_614_F03_RUNTIME_ESTABLISHMENT_CONTRACT_AMENDMENT_V0_1.md
Analysis: docs/STEP_614_F03_RUNTIME_ESTABLISHMENT_ANALYSIS_V0_1.md

## Ordering

1. Receive VERIFIED processingContext and exact fromBlock/toBlock.
2. Assert writer-fence ownership.
3. Re-read the durable processing result by processingResultId.
4. Require durable result range/generation/canonicality to match the context exactly.
5. Re-read every canonicalEvidenceId from the evidence repository and verify it cryptographically.
6. Convert the durable processing result to the existing deriveV4EvidenceCommitment input contract without changing its semantic values.
7. Derive segment/manifest/checkpoint commitments using only deriveV4EvidenceCommitment.
8. Build complete deterministic F-03 provenance from the processing result/context and evidence-set identity.
9. Call existing commitF03AuthorityChain once under the writer fence.
10. Re-read with existing readF03AuthorityChain and verify exact range/generation/commitments.
11. Return the verified expected authority.
12. Only then does createAuthorityGate continue to production authority validation/commit and cursor handling.

## Existing valid chain

If a valid chain already exists, the adapter must verify it and return it. It must not regenerate or rewrite the chain. If the durable chain conflicts with newly derived commitments, fail closed with the existing integrity boundary.

## Persistence atomicity

No new transaction implementation is introduced. commitF03AuthorityChain remains the single atomic persistence mechanism. Its snapshot/rollback behavior remains authoritative for durable-save failure.

## Operator/runtime integration

createAuthorityGate will pass processingContext to expectedAuthorityFactory. The durable factory remains read-only when no verified processing context is supplied (startup/reconciliation). A new establishment wrapper is used only for the runtime authority-gate call where the exact verified processing context is available.

## Forbidden paths

No cursor writes, V4 activation, production-authority source reuse, expected-chain copying, latest-head inference, timestamp/randomness commitment derivation, Surveillance input, fallback authority, or new schema.

## Test surface

Cover: absent-chain establishment, idempotent replay, conflicting chain, missing result, missing evidence, evidence hash/identity corruption, range/generation mismatch, reorg-invalidated context, writer-fence failure, durable-save failure, restart/re-read, and cursor non-advancement on establishment failure.
