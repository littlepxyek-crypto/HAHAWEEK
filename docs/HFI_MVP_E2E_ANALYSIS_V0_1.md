# HFI-MVP-E2E-V0_1 — ANALYSIS / GAP ANALYSIS

## Authority

- Contract: `docs/CONTRACT_HFI_MVP_E2E_V0_1.md`
- Contract status: AUTHORIZED
- Authority: A0-A5
- Repository: `littlepxyek-crypto/HAHAWEEK`
- Analysis is limited to the active HFI-MVP vertical slice. No external publication, signing, trading, transaction execution, identity/deanonymization, predictive scoring, or production V4 authority is introduced.

## Current verified baseline

- Main HEAD before targeted-runtime remediation: `93ccd2ebadef4e4e036a2fc08869e67faa7f7ec0`.
- HFI governance is ACTIVE in `PROJECT_STATE.md`.
- Post-merge Tests and Security/Regression for the timestamp fix passed.
- HFI E5 runtime reached real acquisition but the public official RPC path returned rate-limit failures.
- The latest runtime artifact associated with the 6b42d7 run embedded an older commit and therefore is NOT valid E5 evidence for that commit.
- The stale-artifact mismatch is treated as an evidence-boundary failure, not as runtime success or failure of the blockchain itself.
- The merged PR #670 exposed a provider-boundary failure: PublicNode returned 403 for archive requests without a personal token. The Contract does not authorize adding external credentials, so this branch restores the official Robinhood RPC and bounds historical discovery/backoff within the existing A0-A5 runtime authority.

## Gap Analysis Matrix

| Area | Blueprint | Contract | Implementation | Tests | Runtime | Status | Gap | Risk |
|---|---|---|---|---|---|---|---|---|
| Governance | Contract + A0-A5 | Required | Active | CI lifecycle | Reconciled | VERIFIED | None in scope | Low |
| Real Robinhood evidence | One real set | AC-01 | Runtime verifier exists | Partial | Not yet valid E5 | PARTIAL | Need successful exact-head E5 artifact | High |
| Pool Created | Required | AC-02 | Decoder + adapter | Existing | Not proven live | PARTIAL | Real formation required | High |
| Liquidity Added | Required | AC-03 | Decoder + explicit positive mapping | Existing | Not proven live | PARTIAL | Real formation required | High |
| First Swap | Required | AC-04 | Decoder + formation ordering | Existing | Not proven live | PARTIAL | Real formation required | High |
| Temporal order | Required | AC-05 | Block/tx/log ordering + block timestamp | Existing | Not proven live | PARTIAL | Real formation required | High |
| Raw evidence | Required | AC-06 | Existing raw boundary + runtime capture | Existing | Artifact boundary hardened | IMPLEMENTED / E5 PENDING | Need successful runtime evidence | Medium |
| Canonical evidence | Required | AC-07 | Existing canonical layer | Existing | E2E pending | PARTIAL | Real runtime lineage | Medium |
| Deterministic identity | Required | AC-08 | Existing JCS-backed identity | Existing | E2E pending | PARTIAL | Real runtime replay | Medium |
| Integrity / provenance | Required | AC-09 | Existing integrity primitives + runtime manifest | Existing | E2E pending | PARTIAL | Full runtime lineage proof | High |
| Evidence Graph | Required | AC-10 | Existing deterministic graph | Existing | E2E pending | PARTIAL | Real formation projection | Medium |
| Formation ID | Required | AC-11 | Frozen formation engine | Existing | E2E pending | PARTIAL | Real formation | High |
| Historical Outcome | Required | AC-12 | Versioned outcome implementation | Existing | E2E pending | PARTIAL | Real 7-day observation set | High |
| Liquidity Survival | Required | AC-13 | HFI methodology documented; evaluator supports version | Dedicated unit tests | E2E pending | PARTIAL | Successful complete coverage | High |
| Unknown / incomplete semantics | Required | AC-14 | Fail-closed outcome/validation semantics | Existing | Failure evidence preserved | IMPLEMENTED | E5 confirmation pending | Medium |
| Validation | Required | AC-15 | Frozen boundary + result | Existing | E2E pending | PARTIAL | Real outcome required | High |
| Research Report | Required | AC-16/17 | Existing report/claim lineage | Existing | E2E pending | PARTIAL | Real validated lineage | High |
| X projection | Required | AC-18 | Existing derived projection | Existing | E2E pending | PARTIAL | Real report input | Medium |
| Replay | Required | AC-19 | Runtime replay comparison | Existing | E2E pending | PARTIAL | Exact successful runtime | High |
| Restart / recovery | Required | AC-20 | Existing repository runtime boundaries | Existing | HFI-specific E5 pending | PARTIAL | Verify HFI restart boundary | High |
| Reorg / failure | Required | AC-21 | Existing boundaries + HFI failure capture | Security/regression | E5 failure observed | PARTIAL | Applicable live evidence | Medium |
| Security / regression | Required | AC-22 | Existing suite | Passed on prior merge | HFI remediation CI pending | PARTIAL | Fresh PR-head verification | Medium |
| CI | Required | AC-23 | Workflow exists | Prior runs passed | New branch pending | PARTIAL | Fresh CI | Medium |
| Post-merge | Required | AC-24 | Repository process exists | Not yet | Not yet | NOT_STARTED | Merge + exact-head checks | High |
| PROJECT_STATE | Required | AC-25 | HFI ACTIVE entry exists | N/A | Pending reconciliation | PARTIAL | Reconcile after verified result | Medium |
| Documentation | Required | AC-26 | Contract/frozen docs + HFI analysis/design | N/A | Must track actual state | PARTIAL | Final reconciliation | Medium |
| Authority boundary | Required | AC-27 | A0-A5 only | Existing | No external action | VERIFIED | None | Low |
| History preservation | Required | AC-28 | No deletion/reset | Existing | Preserved failures | VERIFIED | None | Low |

## Targeted runtime remediation analysis

The exact-main E5 rerun on `93ccd2ebadef4e4e036a2fc08869e67faa7f7ec0` reached the same provider boundary: the public Robinhood RPC returned `429 Rate Limit Hit` during the bounded candidate pass. The failure is preserved as E5 runtime evidence and is not treated as formation failure.

The smallest in-scope remediation is a **targeted candidate verification mode**. `HFI_POOL_ID` and `HFI_POOL_INIT_BLOCK` are operator-provided candidate hints only. The verifier still obtains `Initialize`, `ModifyLiquidity`, `Swap`, block timestamps, raw evidence, canonical evidence, formation, outcome, validation, report, graph, and replay data from the Robinhood Mainnet RPC. A candidate hint is never copied into evidence or treated as authoritative by itself.

The initial target hint is the WETH/USDG V4 pool `0x387bf619da4d3fb62bb276482693dba1b9b3520f573cabdfe033384a24125982`, with initialization block `169464`, selected solely to reduce broad historical discovery RPC load. The target must pass an exact `Initialize` lookup before any downstream evidence is accepted. The hint source is not part of the evidence chain.

This mode does not grant external-provider, publication, signing, trading, cursor, writer-fence, identity, or production authority. It only narrows candidate selection for the existing read-only E5 verifier.

The first targeted post-merge run reached the selected pool but failed inside its formation log acquisition with an opaque `AggregateError`. The runtime source uses a 10,000-block formation window; Robinhood ecosystem indexing work documents that public RPC range queries can reject windows once the log count becomes representative. The bounded remediation therefore keeps the same 10,000-block semantic horizon but acquires targeted formation logs in 500-block chunks. Failure diagnostics are also preserved with nested provider messages where available.

A subsequent exact-main run on `5b990a6816c7f82e6bc680dc64fb2df920106aaa` reached the target path but the official public RPC returned transport failures (`ECONNREFUSED` / `ENETUNREACH` / `ETIMEDOUT`) twice. Robinhood's current documentation states that the public endpoint is rate-limited/best-effort and recommends managed providers for sustained or historical reads. The next bounded acquisition change uses `https://rpc.ordofi.network` in CI as a read-only transport. The verifier continues to require chain_id 4663 and performs only standard read methods; no transaction execution, signing, or private-key handling is introduced.

The first OrdoFi E5 attempt completed the targeted 10,000-block formation scan but then failed with `could not coalesce error` during the historical observation phase. The candidate is known to have substantial swap history, and the verifier was issuing one HTTP request per unique swap block because the provider was configured with `batchMaxCount=1`. The next transport-only remediation raises targeted batch size to 25, reducing request count while preserving the same block-level timestamp inputs and event ordering.

The subsequent exact-main E5 with batch size 25 still ended with `could not coalesce error`. The diagnostic run then identified the exact cause: OrdoFi returned JSON-RPC `-32005`, `too many concurrent requests from this address (16 in flight for over 2s; slow down)`, during `historical_block_reads`. The next remediation caps targeted block-read batch concurrency at four while retaining 25 block lookups per transport batch. This changes request scheduling only; the block set, timestamps, event ordering, and downstream evidence semantics remain unchanged.

The following exact-main E5 then reached `formation_logs` but received a transient OrdoFi `-32005` busy response. Targeted log acquisition now has a longer bounded retry window (12 attempts, maximum 10 seconds between attempts); default non-targeted behavior remains unchanged.

The next exact-main E5 successfully acquired and reconstructed the selected native/USDG candidate, but historical Liquidity Survival was `INCONCLUSIVE` because observation bucket 2 had no evidence. This is preserved as uncertainty. To seek a complete historical outcome without changing the validation rule, CI now targets a separate active USDG/U V4 pool (`0xf399bd1544377680d48c62fd85c2105b869e55906c4189cc5ab3b4e83446928c`, initialization block `59281988`) as a candidate-selection hint. External index data is only a hint; runtime acceptance remains exclusively RPC-derived.

## Critical findings

1. The HFI Contract is active; this is not a governance blocker.
2. The remaining primary gate is E5: one complete real formation and downstream seven-day outcome.
3. The prior artifact/commit mismatch is a provenance failure. It cannot be used for AC-01 or any downstream E5 claim.
4. RPC provider rate limiting is an acquisition failure boundary. The runtime remains read-only and chain_id-bound. Because the official public RPC repeatedly rate-limited historical acquisition, the workflow may use the keyless archive-capable Robinhood RPC source documented for this remediation, with no credential. Acquisition remains bounded to the minimum historical range needed for a seven-day post-formation outcome and transient RPC failures receive bounded exponential backoff.
5. The HFI Liquidity Survival methodology is explicitly versioned as `liquidity-survival-hfi-v1`; missing/incomplete coverage remains INCONCLUSIVE.
6. The Evidence Graph remains unchanged because its existing deterministic/non-authoritative semantics are sufficient for the vertical slice.

## Phase status

- CONTRACT: VERIFIED / AUTHORIZED
- ANALYSIS: VERIFIED for current remediation boundary
- DESIGN: VERIFIED on the HFI remediation branch
- CODE: IMPLEMENTED on branch; CI pending
- TEST: PENDING fresh branch CI
- SECURITY/REGRESSION: PENDING fresh branch CI
- CI: PENDING
- REVIEW: PENDING
- MERGE: PENDING
- POST-MERGE VERIFICATION: PENDING
- RUNTIME: BLOCKED until a fresh exact-commit artifact from the official RPC produces a complete verified formation/outcome or a preserved, accurately classified failure; targeted candidate mode is now implemented for the next E5 attempt
- RECONCILIATION: PENDING
- DOCUMENTATION: THIS ANALYSIS UPDATED; final reconciliation pending

## Stop condition

Do not declare HFI-MVP complete until AC-01 through AC-28 are supported by the appropriate verification class and reconciled against the resulting main/runtime state.


## 2026-10-02 Runtime Timeout Boundary

Exact-main E5 on `41a5df1758f4d87c757e4bd40ac0977f980333f7` selected the configured historical candidate but the GitHub runtime job reached its 25-minute timeout and was cancelled. The preserved artifact remained `RUNNING`, so the run is not accepted as E5 verification and is not interpreted as a candidate failure.

The bounded remediation increases only the HFI runtime workflow timeout to 45 minutes and adds SIGTERM terminal-state preservation: a runtime process cancelled by the workflow records `CANCELLED` with `RUNTIME_CANCELLED` rather than leaving a misleading `RUNNING` artifact. No formation, outcome, validation, evidence, identity, cursor, writer-fence, or external-action semantics change.
