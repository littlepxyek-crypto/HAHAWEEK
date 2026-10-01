# HFI-MVP-E2E-V0_1 — RPC Provider Remediation Analysis v0.1

## Authority
Contract: HFI-MVP-E2E-V0_1. Authority A0-A5 only.

## Observed E5 boundary
Exact-main runtime on `5b990a6816c7f82e6bc680dc64fb2df920106aaa` failed twice against the public Robinhood RPC. Both artifacts are commit-matched E5 evidence. The failures are transport-level `ECONNREFUSED`, `ETIMEDOUT`, and `ENETUNREACH`; no formation conclusion was established.

## Gap
The verifier cannot establish AC-01 through AC-18 when the configured RPC endpoint is unreachable from the GitHub runner.

## Remediation
Use a documented keyless Robinhood Mainnet JSON-RPC endpoint as the runtime acquisition source for the E5 workflow. The endpoint must report chain_id 4663 and support the existing read-only methods. No credential, signing, transaction, cursor, writer-fence, evidence, identity, formation, outcome, validation, or publication semantics change.

## Non-goals
No fallback evidence mixing, no provider disagreement resolution, no external credentials, no publication, no trading, no cursor mutation.

## Acceptance
The provider-only change is accepted only if Tests, Security/Regression, and exact-main E5 artifact provenance succeed; E5 remains FAILED if the provider cannot establish a complete formation/outcome.
