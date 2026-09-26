# STEP 612 — Analysis — Price Impact / Slippage

Status: ANALYSIS — DRAFT FOR VERIFICATION
Date: 2026-09-26

## 1. Objective
Freeze the calculation and evidence boundary required by the STEP 612 Contract before Design or Code. This document is analysis only and introduces no production implementation.

## 2. Repository Evidence Inspected
Main was inspected after STEP 612 Contract reconciliation merge 8701c88b3b77a8306e38daa8ec0294bcbf901953.

Relevant existing interfaces:
- src/core/domain-measurement.js: derived measurement envelope, admission checks, rule versions, payload validation, deterministic observation creation.
- src/core/surveillance-observation.js: temporal invariant, validation vocabulary, deterministic identity, evidence references, non-authoritative observation construction.
- src/core/pool-discovery.js: existing PoolManager and chain boundary, Initialize decoding, pool identity, initial sqrtPriceX96.
- src/core/pool-identity.js: canonical pool identity and currency ordering.
- src/core/swap-event.js: Swap decoding with pool ID, amount0, amount1, sqrtPriceX96, liquidity, tick, fee, block and transaction provenance.
- src/core/liquidity-event.js: existing liquidity-event provenance and pool context.
- tests/swap-event.test.js and tests/domain-measurement.test.js: existing regression boundaries.

The repository therefore has a concrete PoolManager concentrated-liquidity event boundary, but no frozen price-impact or slippage calculation contract.

## 3. Supported Pool / AMM Model
STEP 612 v1 supports only the existing PoolManager concentrated-liquidity pool event model represented by the existing Initialize and Swap semantic adapters.

Pool identity is bound to chain ID, pool ID, currency0 and currency1. Evidence from another pool must never be combined.

Explicitly unsupported unless a future Contract adds it:
- generic constant-product fallback;
- pools without an admitted PoolManager identity;
- unsupported hook-specific pricing behavior when the required effective reference or quote cannot be evidenced;
- multi-hop execution as one undifferentiated pool measurement;
- inferred reserves or liquidity from unrelated observations;
- execution guarantees.

Unsupported cases remain UNKNOWN, INCONCLUSIVE, UNVERIFIED, or CONFLICTING as applicable. No silent fallback is allowed.

## 4. Price Convention
Canonical price convention: quote units per one base unit.

Every measurement explicitly identifies base asset, quote asset, direction, and decimals for both assets. Direction is BASE_TO_QUOTE or QUOTE_TO_BASE.

For the ordered pool assets, raw marginal price represented by sqrtPriceX96 is:

P_raw_1_per_0 = sqrtPriceX96 squared divided by 2 to the power 192.

Decimal normalization converts this to quote units per base unit. Decimal metadata must be admitted evidence.

Persisted calculation identity and final values must not depend on IEEE-754 floating point.

## 5. Required Price-Impact Inputs
All inputs must be admitted and provenance-linked:
1. exact pool identity;
2. exact swap identity and provenance;
3. amount0 and amount1 from the decoded Swap event;
4. an admitted pre-trade reference price for the same pool, including sqrtPriceX96 and its event or block position;
5. explicit base and quote direction;
6. token decimals for both assets;
7. calculation rule version;
8. evidence references for every input.

The post-swap sqrtPriceX96 from the Swap event must not silently be treated as the pre-trade reference price.

If the pre-trade state cannot be established unambiguously, price impact is not computable and must fail closed.

## 6. Execution Price
For an explicit base and quote direction:

P_exec = absolute(quote amount) divided by absolute(base amount), followed by exact decimal normalization.

Direction must not be inferred from token names, symbols, market convention, or address ordering alone.

Zero denominator, zero required amount, sign ambiguity, or inconsistent asset deltas must fail closed.

## 7. Price Impact Formula
Reference and execution prices must use the same quote-per-base convention.

price_impact = (P_ref - P_exec) / P_ref

Design must freeze the exact deterministic fixed-point or rational representation, scale, integer width, rounding mode, and serialization format before Code.

Negative results must not be silently clamped to zero. Zero reference price, unexpected sign, or inconsistent direction is an explicit validation outcome.

## 8. Slippage Formula
Slippage requires independent expected or quoted price evidence.

Required additional evidence:
- quoted quote-per-base rate;
- quote timestamp or block and provenance;
- exact base amount and direction for which the quote applies;
- evidence that the quote is comparable to the observed execution.

slippage = (P_quote - P_exec) / P_quote

The quote must not be reconstructed from the same execution observation and then treated as independent evidence.

Missing, stale, conflicting, directionally incompatible, or size-incompatible quote evidence results in UNVERIFIED or INCONCLUSIVE rather than estimation.

## 9. Units, Precision, Rounding, Invalid Inputs
- raw token amounts remain integer strings;
- decimal normalization is exact and evidence-backed;
- no floating-point value determines the persisted result;
- zero denominator or reference price is invalid;
- inconsistent amount combinations are invalid unless the selected direction explicitly accounts for them;
- missing decimals are insufficient evidence;
- missing reference price is insufficient evidence;
- conflicts never use latest-wins resolution;
- rounding occurs only at the final explicitly versioned serialization boundary.

Design must freeze exact scale, overflow policy, rounding mode, and serialized field types.

## 10. Evidence and Provenance Binding
Every derived measurement retains references to pool identity evidence, swap evidence, pre-trade reference-price evidence, token-decimal evidence, quote evidence when slippage is measured, and any model-parameter evidence required by the supported model.

All payload evidence references must be admitted before observation construction. Missing or unresolved references fail closed.

## 11. Deterministic Identity
Identity must bind at minimum to schema version, observation type, chain ID, exact entity or pool reference, sorted evidence references, provenance reference, event and observation timestamps, calculation rule version, validation status, uncertainty, canonical calculation payload, explicit base and quote direction, asset references, and reference-price or quote identities.

Processing time remains excluded from identity, consistent with the existing Surveillance observation boundary.

## 12. Temporal, Reorg, and Version Rules
The existing invariant remains mandatory:

event_time <= observation_time <= processing_time

Reference and quote evidence must satisfy declared temporal ordering. Future information must not leak into the reference state.

A reorg or changed canonical evidence set creates a new versioned derived observation. Prior observations remain preserved. No cursor reset or historical rewrite is permitted.

## 13. Conflict Handling
Conflicting reference prices, quotes, token metadata, pool identity, or trade inputs must not be resolved by latest-wins logic.

The measurement is withheld or explicitly marked CONFLICTING or INCONCLUSIVE according to evidence state. Conflicting evidence references remain traceable.

## 14. Surveillance and Authority Boundary
The result remains derived, evidence-linked, versioned, deterministic, reproducible, and non-authoritative.

ADDRESS != ACTOR remains unchanged.

No raw or canonical evidence mutation, cursor movement, transaction submission, trading, automated action, actor inference, deanonymization, predictive scoring, or risk authority is introduced.

## 15. Operator Acceptance
No new command is invented during Analysis.

Before lifecycle completion, operator behavior must be grounded in existing repository interfaces and must explain supported inputs, missing or conflicting evidence, output interpretation, failure recognition, recovery behavior, recovery verification, evidence preservation, and STOP or FAIL-CLOSED conditions.

## 16. Design Gate Requirements
Before Code, Design must freeze:
1. exact price-impact and slippage payload schema;
2. exact fixed-point or rational representation;
3. decimal scaling and rounding;
4. base and quote direction encoding;
5. pre-trade reference acquisition boundary;
6. quote comparability rule;
7. validation and uncertainty mapping;
8. deterministic identity additions;
9. reorg and version behavior;
10. deterministic test vectors and boundary cases.

## 17. Analysis Acceptance Criteria
Analysis is complete only when one concrete supported pool model is identified from repository evidence; price convention and direction are explicit; required inputs and evidence are explicit; formulas are explicit; invalid, zero, and conflict behavior is explicit; identity requirements are explicit; temporal and reorg behavior are explicit; protected authority boundaries remain unchanged; and no production implementation is introduced.

## 18. Out of Scope
Production implementation before Design, V4 production activation, trading, execution, transaction submission, automated financial action, prediction, scoring or risk authority, actor or ownership inference, deanonymization, generic AMM fallback, historical rewrite, raw or canonical evidence mutation, and cursor reset or advancement remain out of scope.