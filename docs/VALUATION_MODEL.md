# Valuation model

This document describes the fixed, Phase 1.1-calibrated heuristic implemented in `src/`. It explains **how the model calculates**, not what a real buyer will pay. The multiples and factors are assumptions, not empirically proven multiples, statistically validated market pricing or buyer-demand predictions. All monetary values are USD.

## 1. Input normalization

`calculateValuation` always calls `normalizeInput` and never mutates its argument. Missing or invalid runtime enum values use `DEFAULT_INPUT`; missing/invalid quality dimensions use the corresponding default rating. Numeric strings and booleans are not coerced to numbers. Invalid/non-finite numeric values become zero; finite numbers are clamped to their bounds. Asset/risk flags are true only for literal `true`. Notes report normalization where implemented.

| Numeric input | Inclusive bounds |
| --- | --- |
| `developmentHours` | 0–100,000 |
| `hourlyRate` | 0–1,000 |
| `monthlyRevenue` | 0–10,000,000 |
| `monthlyProfit` | 0–10,000,000, then capped at revenue |

Zero revenue forces zero profit, `No revenue` type and history. Positive revenue with `No revenue` type becomes `One-time`; positive revenue with `No revenue` history becomes `less than 3 months`. Negative profits are clamped to zero; future losses are not modeled. Project type and project age describe the project but add no independent financial premium. Use the exact string tokens in the public `ValuationInput` type, including en dashes in age/history ranges.

## 2. Replacement cost

```text
replacementCost = developmentHours × hourlyRate
```

This estimates rebuilding effort at a replacement developer's rate. Development spending does not equal market value.

## 3. Development status adjustment

| Status | Factor |
| --- | ---: |
| Prototype | 0.20 |
| MVP | 0.35 |
| Production | 0.50 |

These marketability assumptions discount replacement effort before quality and transferability adjustments.

## 4. Quality and base software asset value

The six equally weighted dimensions are `codeQuality`, `architecture`, `documentation`, `testCoverage`, `uiUx` and `deploymentReadiness`.

| Rating | Factor |
| --- | ---: |
| Poor | 0.70 |
| Basic | 0.90 |
| Good | 1.05 |
| Excellent | 1.15 |

```text
qualityFactor = sum of the six rating factors / 6
baseAssetValue = replacementCost × statusFactor × qualityFactor
```

There are no age or software-category premiums.

## 5. Transferable asset bonuses

| Asset flag | Bonus on base assets |
| --- | ---: |
| `domain` | 2% |
| `customers` (existing users/customers) | 4% |
| `brand` (brand/design assets) | 2% |
| `documentation` | 0% |
| `automatedTests` | 0% |
| `ciCd` | 0% |
| `liveDemo` | 0% |

The domain/customer/brand sum can reach 8%, but the aggregate is capped at **6%**. Bonuses apply only to base software assets, never the entire business valuation. Documentation, tests and deployment are represented in quality; their transfer checkboxes add descriptive strengths without duplicate percentage bonuses. A live demo helps inspection but receives no price premium.

```text
assetBonusRate = min(0.06, sum of included asset bonuses)
assetAdjustment = baseAssetValue × assetBonusRate
adjustedAssetValue = baseAssetValue + assetAdjustment
```

Adjusted asset value is the standalone software estimate before whole-project risks.

## 6. Business valuation and multiple factors

For positive revenue, both profit and revenue methods use the same type × history × trend adjustment, with independent bounds.

| Revenue type | Factor |
| --- | ---: |
| No revenue | 0; business methods skipped after normalization |
| One-time | 0.80 |
| Mixed | 1.00 |
| Recurring | 1.20 |

| Revenue history | Factor |
| --- | ---: |
| No revenue | 0; business methods skipped after normalization |
| less than 3 months | 0.75 |
| 3–6 months | 0.85 |
| 6–12 months | 1.00 |
| 12+ months | 1.15 |

| Trend | Factor |
| --- | ---: |
| Declining | 0.80 |
| Stable | 1.00 |
| Growing | 1.15 |

```text
factors = revenueTypeFactor × historyFactor × trendFactor
annualProfit = monthlyProfit × 12
adjustedProfitMultiple = clamp(2.5 × factors, 1, 4.5)
profitValue = annualProfit × adjustedProfitMultiple
```

The base annual profit multiple is **2.5**, bounded from **1 to 4.5** after adjustment. These assumptions do not claim market comparables.

## 7. Conservative revenue fallback

```text
annualRevenue = monthlyRevenue × 12
adjustedRevenueMultiple = clamp(0.35 × factors, 0.10, 0.60)
revenueValue = annualRevenue × adjustedRevenueMultiple
businessValue = max(profitValue, revenueValue)
```

The base annual revenue multiple is **0.35**, bounded from **0.10 to 0.60**. This is a floor for businesses with little/zero profit, not an additional amount added to profit value. `businessMethod` is `profit` when profit value is at least revenue value (including ties), otherwise `revenue`. Zero revenue skips both methods, returns zero business value/multiples and method `none`.

## 8. Combining business and software assets

Buying a functioning business includes its software. Full business value plus full replacement/asset value would double count it.

```text
weightedAssetValue = adjustedAssetValue × 0.20
meaningfulBusiness = businessValue > 0
                    and businessValue + weightedAssetValue >= adjustedAssetValue
```

When meaningful business value exists:

```text
valuationBasis = business
assetContributionRate = 0.20
assetContribution = weightedAssetValue
combinedValue = businessValue + assetContribution
```

Otherwise:

```text
valuationBasis = asset
assetContributionRate = 0
assetContribution = 0
combinedValue = adjustedAssetValue
```

The adjusted standalone asset floor is **before risk discounts**. A positive business value below the crossover remains returned for reference, but is not added separately. The crossover is continuous: it occurs when business value reaches 80% of adjusted assets. Bonuses are already inside adjusted assets and must never be added again after combination. A zero-business/zero-assets project remains on the asset basis.

## 9. Risk adjustments

All three risk flags retain whole-project scope after combination:

| Risk | Discount | Reason |
| --- | ---: | --- |
| `technicalDebt` | 20% | Significant remediation can interrupt operations and create future costs beyond routine quality/current profit. |
| `licensing` | 30% | Uncertain third-party rights can prevent software transfer or continued business operation. |
| `keyPerson` | 15% | Dependence on one person can impair maintenance, customer continuity and buyer handover. |

The raw sum can reach 65%, but aggregate discounts are capped at **55%**.

```text
riskDiscountRate = min(0.55, sum of active risk discounts)
riskAdjustment = -combinedValue × riskDiscountRate
unroundedMidpoint = max(0, combinedValue + riskAdjustment)
```

With no risk, the returned adjustment is positive zero rather than negative zero. The discounts are deliberately weighted differently but share the same scope; they do not represent an evaluation of legal rights or a remediation budget.

## 10. Confidence

Begin at **35** points and apply all applicable evidence before clamping:

| Evidence | Points |
| --- | ---: |
| Production | +15 |
| Prototype | −15 |
| MVP | 0 |
| No revenue | −20 |
| Recurring revenue, only when revenue is positive | +10 |
| 12+ months revenue history, only when revenue is positive | +20 |
| 6–12 months revenue history, only when revenue is positive | +10 |
| less than 3 months revenue history, only when revenue is positive | −10 |
| 3–6 months history | 0 |
| Existing users/customers | +10 |
| Good/Excellent documentation quality | +10 |
| Licensing concerns | −25 |
| Significant technical debt | −15 |

History adjustments are mutually exclusive. Customers/documentation evidence and licensing/debt penalties apply regardless of revenue. Key-person dependency discounts value but has **no separate confidence penalty**. No trend, age, type or other quality dimension adds confidence points.

Clamp the score to **0–90** after evidence and penalties. High is **≥75**, Medium is **≥45 and <75**, Low is **<45**. Confidence is an evidence indicator, not a statistical probability; even a high score does not promise a sale.

## 11. Estimate range and rounding

| Confidence | Width around unrounded midpoint |
| --- | --- |
| High | ±15% |
| Medium | ±25% |
| Low | ±35% |

```text
rawLow = unroundedMidpoint × (1 - width)
rawHigh = unroundedMidpoint × (1 + width)
```

Select **one rounding step from the unrounded midpoint**, not separately from each endpoint:

| Unrounded midpoint | Step |
| --- | ---: |
| ≥100,000 | 1,000 |
| ≥10,000 and <100,000 | 500 |
| ≥1,000 and <10,000 | 100 |
| ≥100 and <1,000 | 10 |
| <100 | 1 |

Round low, midpoint and high using `Math.round(value / step) * step`. No intermediate calculation is rounded; all results use ordinary JavaScript IEEE-754 number arithmetic. The shared step preserves ordered endpoints, including zero. Floating-point details are part of the unchanged implementation; do not reconstruct outputs from formatted UI values.

## 12. Breakdown and explanatory output

See `ValuationResult` for every public field. `explanations.ts` emits strengths, risks and calculation reasons from normalized input, using the same constants and chosen method/basis. Those strings are part of the preserved extraction, including risk rationale, informational assets and business/asset explanations. `validationNotes` are returned independently. Do not interpret replacement cost or the standalone adjusted assets as an additional amount beyond `combinedValue`.

## 13. Regression verification

The retained production tests cover A–E with exact ranges, confidence scores, business/asset values, risk adjustment, raw midpoint and valuation basis. Their scenario inputs live in `tests/calculate.test.ts`.

| Fixture | Midpoint | Low | High | Confidence / score |
| --- | ---: | ---: | ---: | --- |
| A — Pre-revenue production product | 21,500 | 14,000 | 29,500 | Low / 40 |
| B — Small profitable SaaS | 57,500 | 49,000 | 66,500 | High / 90 |
| C — Growing SaaS | 306,000 | 260,000 | 352,000 | High / 90 |
| D — One-time plugin | 27,000 | 23,000 | 31,000 | High / 80 |
| E — Risky legacy project | 20,500 | 13,500 | 28,000 | Low / 40 |

These are regression fixtures, not market benchmarks. Additional tests check normalization boundaries, threshold classification, each rounding band, method selection, deterministic execution and non-mutation. The initial extraction preserves the five production modules byte-for-byte; test imports change only for the standalone layout. There is no runtime link back to the production application.

## Limitations and disclaimer

The engine does not verify user input, ownership, transferable contracts, debts, tax, churn, forecasts, owner compensation or market comparables. Self-reported quality and effort can be misleading. No external market data, model fitting or independent professional review is incorporated into the calculation.

This project provides indicative estimates only and does not constitute financial, investment, legal, or professional valuation advice. Actual transaction value may depend on buyer demand, due diligence, intellectual property ownership, contracts, liabilities, market conditions, and project-specific circumstances.
