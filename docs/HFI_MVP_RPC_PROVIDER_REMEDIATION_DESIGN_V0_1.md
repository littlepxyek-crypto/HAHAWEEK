# HFI-MVP-E2E-V0_1 — RPC Provider Remediation Design v0.1

## Scope
Change only the HFI-MVP runtime workflow's RPC endpoint. Keep the verifier implementation and all semantic rules unchanged.

## Provider
Configure the workflow to use `https://rpc-robinhood.blockmachine.io`, a keyless Robinhood Chain JSON-RPC endpoint. The verifier still asserts chain_id 4663 and obtains all formation/outcome evidence directly through JSON-RPC.

## Provenance
The runtime artifact records the configured RPC URL. Provider selection is acquisition metadata; it is not evidence by itself. Candidate hints remain non-authoritative.

## Safety
No API key. No write methods. No external mutation. No cursor/checkpoint/writer-fence interaction. Existing failure and INCONCLUSIVE semantics remain unchanged.

## Verification
Run repository Tests and Security/Regression on the branch, merge only after required checks, then inspect the exact-main E5 artifact. A successful workflow status alone does not establish HFI-MVP completion.
