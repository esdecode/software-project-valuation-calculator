# Software Project Valuation Calculator

A deterministic TypeScript engine for estimating the indicative value of SaaS products, web apps, mobile apps, plugins, scripts, boilerplates, and other software projects.

**Live calculator:** [Try the live Software Project Valuation Calculator on Esdecode](https://esdecode.com/tools/software-project-valuation-calculator).

Created by [ESDecode](https://esdecode.com/). This repository contains an independent extraction of the live calculator's tested Phase 1.1 engine, with no application infrastructure or runtime connection to the website.

## What it does

Given project effort, maturity, quality, transferable assets, operating results and risks, `calculateValuation` returns an estimated range, midpoint, confidence level and explainable breakdown. It also works with zero revenue and zero profit. Replacement cost is informational; it is not treated as sale price.

The model is a fixed heuristic, not a professional appraisal or an empirical prediction of buyer demand.

## Live calculator

The browser-based calculator linked above lets you use the same valuation model without installing the package. This engine can also run independently in Node.js, a browser application with suitable bundling, or other JavaScript environments providing `structuredClone`.

## Features

- Deterministic, reproducible output without an external API or runtime dependencies.
- Pre-revenue software asset valuation using development effort, maturity and six quality dimensions.
- Annual profit valuation and a conservative annual revenue fallback for low/zero profit.
- Recurring, one-time and mixed revenue, with history and trend adjustments.
- Modest transferable asset adjustments capped at 6% of base software assets.
- Partial software contribution and a standalone asset floor to avoid full asset/business double counting.
- Technical debt, third-party licensing and key-person discounts capped at 55%.
- Low/Medium/High confidence ranges, bounded scores and sensible monetary rounding.
- Defensive input normalization, strengths, risks, explanations and validation notes.

## Installation / local usage

Requires Node.js 20 or later and npm. The package is **not published to npm** in this phase.

Clone this repository (when hosted), or open the prepared local repository:

```sh
git clone https://github.com/esdecode/software-project-valuation-calculator.git
cd software-project-valuation-calculator
npm install
npm run build
npm run example
```

To use the built package from another local project, run `npm install /absolute/path/to/software-project-valuation-calculator` there after building it. Its entry point includes TypeScript declarations and CommonJS JavaScript; both `require` and ESM named imports are supported. There is no dependency on the original application.

## Quick start

```ts
import {
  calculateValuation,
  DEFAULT_INPUT,
  type ValuationInput,
} from "software-project-valuation-calculator";

const project: ValuationInput = {
  ...structuredClone(DEFAULT_INPUT),
  projectType: "SaaS",
  projectAge: "1–2 years",
  developmentStatus: "Production",
  developmentHours: 1200,
  hourlyRate: 60,
  monthlyRevenue: 2000,
  monthlyProfit: 1200,
  revenueType: "Recurring",
  revenueHistory: "12+ months",
  revenueTrend: "Stable",
  quality: {
    codeQuality: "Good", architecture: "Good", documentation: "Good",
    testCoverage: "Good", uiUx: "Good", deploymentReadiness: "Good",
  },
  assets: {
    domain: true, documentation: true, automatedTests: true,
    ciCd: true, liveDemo: true, customers: true, brand: true,
  },
};

const result = calculateValuation(project);
console.log({
  midpoint: result.midpoint,                 // 57500
  lowEstimate: result.lowEstimate,           // 49000
  highEstimate: result.highEstimate,         // 66500
  confidence: result.confidence,             // "High"
  businessValue: result.businessValue,       // 49679.99999999999 (about 49680)
  adjustedAssetValue: result.adjustedAssetValue, // 40068
});
```

The same runnable example lives in `examples/basic.ts` and is included in type checking. Clone defaults before modifying nested objects: constants/defaults are shared values, not per-call instances.

## Inputs

`ValuationInput` uses these exact keys and tokens:

| Input | Values / meaning |
| --- | --- |
| `projectType` | `SaaS`, `Web App`, `Mobile App`, `Plugin`, `Script`, `Boilerplate`, `Other` |
| `projectAge` | `less than 3 months`, `3–6 months`, `6–12 months`, `1–2 years`, `2+ years` |
| `developmentStatus` | `Prototype`, `MVP`, `Production` |
| `developmentHours`, `hourlyRate` | Finite nonnegative hours and USD/hour; maxima 100,000 and 1,000 |
| `monthlyRevenue`, `monthlyProfit` | Finite nonnegative monthly USD; each bounded at 10,000,000; profit capped at revenue |
| `revenueType` | `No revenue`, `One-time`, `Recurring`, `Mixed` |
| `revenueHistory` | `No revenue`, `less than 3 months`, `3–6 months`, `6–12 months`, `12+ months` |
| `revenueTrend` | `Declining`, `Stable`, `Growing` |
| `quality` | `codeQuality`, `architecture`, `documentation`, `testCoverage`, `uiUx`, `deploymentReadiness`; each `Poor`, `Basic`, `Good`, `Excellent` |
| `assets` | Boolean `domain`, `documentation`, `automatedTests`, `ciCd`, `liveDemo`, `customers`, `brand` |
| `risks` | Boolean `technicalDebt`, `licensing`, `keyPerson` |

Zero revenue forces zero profit and no-revenue type/history. Positive revenue with no-revenue type/history is conservatively treated as one-time revenue with less than three months of history. Invalid numeric values become zero, finite extremes are clamped, invalid enum/quality values use defaults, and flags require literal `true`. Normalization notes are returned. Type and age are descriptive: there is no category/age premium. All monetary inputs/outputs use USD; no currency conversion is provided.

`DEFAULT_INPUT` is a production SaaS aged 6–12 months with 500 hours at $50/hour, no revenue/profit, stable trend, Good code/architecture/UI/deployment, Basic documentation/tests, and all flags false.

## Result

`ValuationResult` includes:

- `lowEstimate`, `midpoint`, `highEstimate`: rounded indicative USD estimates.
- `confidence`, `confidenceScore`, `confidenceReasons`: evidence level, score capped at 90, and reasons; not a probability.
- `replacementCost`, `qualityFactor`, `baseAssetValue`, `assetBonusRate`, `assetAdjustment`, `adjustedAssetValue`: standalone software calculation, before project risks.
- `businessValue`, `businessMethod`, `adjustedProfitMultiple`, `adjustedRevenueMultiple`: selected business estimate; method is `none`, `profit` or `revenue`.
- `valuationBasis`, `assetContributionRate`, `assetContribution`, `combinedValue`: asset floor or business plus partial software contribution.
- `riskDiscountRate`, `riskAdjustment`, `unroundedMidpoint`: whole-project discount and raw midpoint.
- `strengths`, `risks`, `explanations`, `validationNotes`: readable reasons and normalization feedback.

Asset adjustments are already included in adjusted assets; do not add them again. `businessValue` is a reference only when `valuationBasis` is `asset`; `assetContribution` is then zero. A midpoint is not an exact valuation.

The public API exports `calculateValuation`, `normalizeInput`, `DEFAULT_INPUT`, `ValuationInput`, `ValuationResult`, `ConfidenceLevel`, and named model constants for inspection. Confidence/explanation/business helpers remain internal to the entry point. Constants are not a supported override/configuration interface; do not mutate shared model objects.

## How the valuation model works

1. Estimate rebuild cost from hours × replacement rate.
2. Apply maturity and the average quality factor to obtain base asset value.
3. Add transferable domain/customer/brand bonuses, capped at 6% of base assets.
4. Select the higher of annual profit × its adjusted multiple and annual revenue × its conservative adjusted multiple; no revenue gives zero business value.
5. Use business value plus 20% of adjusted assets when it reaches the standalone asset floor; otherwise use adjusted assets alone.
6. Discount the combined value for significant project risks, capped at 55%.
7. Apply evidence-based confidence width and round all three estimates with the same step.

See [the complete valuation model](docs/VALUATION_MODEL.md) for exact factors, normalization, confidence scoring and rounding.

## Regression scenarios

These reviewed fixtures lock software behavior. **They are not market benchmarks.** The source tests include their complete input scenarios and exact breakdown assertions.

| Scenario | Midpoint | Low–High | Confidence (score) |
| --- | ---: | --- | --- |
| A — Pre-revenue production product | $21,500 | $14,000–$29,500 | Low (40) |
| B — Small profitable SaaS | $57,500 | $49,000–$66,500 | High (90) |
| C — Growing SaaS | $306,000 | $260,000–$352,000 | High (90) |
| D — Plugin with one-time sales | $27,000 | $23,000–$31,000 | High (80) |
| E — Risky legacy project | $20,500 | $13,500–$28,000 | Low (40) |

## Model assumptions

All factors and multiples are explicit heuristic assumptions. They are not statistically validated market pricing or empirically proven sales multiples. The model assumes transferable software and representative monthly results; it uses fixed rather than industry-specific multipliers. Confidence describes supplied evidence, not likelihood of a sale. No random values, clock, network or external state affect computation.

This is a synchronized extraction of the tested production engine, not a replacement dependency for the website. Core source was copied without changing its formulas or explanations. Future model changes should be explicit, versioned and tested; changes here do not automatically update the live calculator.

## Limitations

Self-reported hours, quality and operating results are not independently verified. The engine does not model taxes, debt, liabilities, forecasts, churn, owner compensation normalization, acquisition synergies, IP ownership proof, legal due diligence, currency conversion or negative future cash flows. Negative profit is normalized to zero; that is not an analysis of business losses. A risk checkbox cannot resolve a licensing or transfer problem.

## Development

```sh
npm install
npm run typecheck
npm run build
npm run example
```

`src/` contains only the engine and its public entry point. `tests/` uses Node's built-in test runner through `tsx`; `docs/` explains the fixed model. TypeScript, `tsx` and Node type declarations are development-only dependencies. The build emits JavaScript and declarations in ignored `dist/`; generated output is not committed. No secrets, environment configuration, UI, analytics or server infrastructure is required.

## Running tests

```sh
npm test
```

The original 28 model tests are retained with only relative test imports adjusted for this layout. Additional tests exercise the public API, mixed revenue, history factors, key-person risk, confidence boundaries, rounding thresholds and maximum inputs. Tests use no network or browser and cover deterministic repeated execution, invalid/extreme inputs, non-mutation, all risk/bonus caps, confidence/ranges and the five locked fixtures.

## License

MIT. Copyright (c) 2026 ESDecode. See [LICENSE](LICENSE).

## Disclaimer

This project provides indicative estimates only and does not constitute financial, investment, legal, or professional valuation advice. Actual transaction value may depend on buyer demand, due diligence, intellectual property ownership, contracts, liabilities, market conditions, and project-specific circumstances.
