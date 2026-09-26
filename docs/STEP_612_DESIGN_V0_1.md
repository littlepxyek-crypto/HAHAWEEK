# STEP 612 — Design — Price Impact / Slippage

Status: DESIGN — DRAFT FOR VERIFICATION
Date: 2026-09-26

## 1. Design Boundary
Design implements the frozen Analysis without changing raw or canonical evidence authority, acquisition cursor semantics, V4 authority, or production execution authority.

Supported model remains the existing PoolManager concentrated-liquidity event boundary already represented by Initialize and Swap adapters.

## 2. Measurement Types
Two derived observation kinds are defined:
- PRICE_IMPACT
- SLIPPAGE

Both use the existing Surveillance observation envelope and existing deterministic identity mechanism.

## 3. Payload Schema
Common fields:
- measurement_kind
- measurement_version
- pool_ref
- pool_id
- base_asset_ref
- quote_asset_ref
- direction
- reference_price
- execution_price
- result
- input_evidence_refs

PRICE_IMPACT additionally requires pre_trade_reference_evidence_ref.
SLIPPAGE additionally requires quote_reference containing quote price, quote amount, quote timestamp or block, and quote evidence reference.

All numeric quantities are serialized as decimal integer strings or canonical rational objects. No JSON floating-point number is permitted.

## 4. Direction
direction is exactly one of BASE_TO_QUOTE or QUOTE_TO_BASE.

For BASE_TO_QUOTE, base is the asset supplied and quote is the asset received. For QUOTE_TO_BASE, quote is supplied and base is received.

Direction must be explicitly supplied and validated against the admitted pool asset pair. Address ordering alone is not sufficient to infer direction.

## 5. Exact Rational Representation
Prices and derived ratios are represented as reduced rational objects:

{ numerator: decimal integer string, denominator: positive decimal integer string }

The reduction operation uses greatest common divisor over non-negative BigInt values. Denominator is always positive.

No rounding is performed during calculation.

## 6. Reference Price
For ordered currency0 and currency1:

raw token1-per-token0 = sqrtPriceX96 squared / 2^192.

After decimal normalization:

token1-per-token0 = sqrtPriceX96 squared multiplied by 10^decimals0, divided by 2^192 multiplied by 10^decimals1.

For the selected direction, the reference rational is inverted when required so that it is always quote units per base unit.

Required reference evidence must identify the same pool, an admitted pre-trade state, sqrtPriceX96, both token decimals, and its canonical temporal position.

## 7. Execution Price
Given absolute raw base and quote amounts from the admitted swap:

execution price in quote units per base unit = quote_amount multiplied by 10^base_decimals, divided by base_amount multiplied by 10^quote_decimals.

For QUOTE_TO_BASE, the corresponding direction is represented by the same quote-per-base convention after inversion.

Zero denominator or inconsistent direction fails closed.

## 8. Price Impact
With reference price R and execution price E in the same quote-per-base convention:

price impact = (R - E) / R.

R and E are rational values. The result is also a reduced rational.

No clamping is performed. Negative results remain negative and are interpreted through validation/uncertainty state rather than silently rewritten.

## 9. Slippage
With independent quote price Q and execution price E:

slippage = (Q - E) / Q.

Quote evidence must be independently admitted and comparable in pool, direction, base amount, quote amount context, and declared time boundary.

Quote evidence derived from the same execution event is rejected as non-independent.

## 10. Token Decimal Input
Each asset decimal value is an integer from 0 through 255 and must be backed by admitted evidence.

Missing, invalid, conflicting, or unverifiable decimal metadata fails closed.

## 11. Validation Mapping
OBSERVED: all required inputs are admitted, internally consistent, temporally valid, and calculation succeeds.
UNVERIFIED: required external reference or quote evidence cannot be verified sufficiently.
INCONCLUSIVE: evidence exists but comparability or calculation state is insufficient to determine the measurement.
CONFLICTING: two or more admitted evidence sets conflict on an input that changes the result.
UNKNOWN: the required measurement input is absent and no positive or negative conclusion is supported.

No latest-wins resolution is allowed.

## 12. Evidence Binding
input_evidence_refs must contain every evidence reference used by the calculation, including pool identity, swap, pre-trade reference, decimals, and independent quote where applicable.

All payload evidence references must be members of the admitted evidence set before observation creation.

## 13. Deterministic Identity
The existing surveillance identity remains authoritative. The payload included in identity must contain every calculation input and assumption that can change the result, including direction, asset refs, reference rational, execution rational, quote rational where applicable, measurement version, and evidence references.

Processing time remains excluded from identity.

## 14. Reorg and Versioning
Reorg or canonical-evidence changes create a new derived observation with new evidence references and identity.

Prior observations remain immutable. No cursor reset, historical rewrite, or silent replacement is allowed.

## 15. Invalid and Boundary Cases
The implementation must fail closed for:
- zero base amount;
- zero reference price;
- zero quote price when slippage is requested;
- invalid sqrtPriceX96;
- invalid decimal metadata;
- missing pre-trade reference;
- missing independent quote for slippage;
- conflicting pool or asset identity;
- direction not matching the admitted asset pair;
- unresolved payload evidence;
- temporal leakage;
- unsupported model;
- arithmetic or serialization inconsistency.

## 16. Test Vector Design
Design requires deterministic vectors for:
1. identical input reproduction despite processing-time changes;
2. BASE_TO_QUOTE reference price normalization;
3. QUOTE_TO_BASE inversion;
4. exact rational reduction;
5. price-impact positive result;
6. price-impact negative result preserved;
7. zero reference rejection;
8. zero execution denominator rejection;
9. independent slippage quote success;
10. quote derived from execution rejected;
11. conflicting evidence fail-closed;
12. reorg produces a new identity;
13. payload evidence admission failure;
14. input immutability;
15. generic constant-product fallback rejection.

## 17. Operator Boundary
No new command is invented by Design. Operator behavior remains repository-grounded and will be verified in the later lifecycle.

## 18. Authority Boundary
Design introduces no raw or canonical evidence mutation, cursor movement, V4 activation, trading authority, transaction submission, automated action, scoring or risk authority, actor inference, or deanonymization.

ADDRESS != ACTOR remains mandatory.

## 19. Code Entry Gate
Code may begin only after this Design is verified, reconciled, documented as required by the lifecycle, and the current PROJECT_STATE explicitly authorizes Code.