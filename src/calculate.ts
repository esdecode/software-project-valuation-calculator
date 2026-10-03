import { ASSET_BONUSES, CONFIDENCE, HISTORY_FACTORS, LIMITS, MODEL, PROJECT_AGES, PROJECT_TYPES, QUALITY_FACTORS, QUALITY_LABELS, REVENUE_TYPE_FACTORS, RISK_DISCOUNTS, STATUS_FACTORS, TREND_FACTORS } from "./constants";
import { calculateConfidence } from "./confidence";
import { explainValuation } from "./explanations";
import type { ValuationInput, ValuationResult } from "./types";

export const DEFAULT_INPUT: ValuationInput = {
  projectType: "SaaS", projectAge: "6–12 months", developmentStatus: "Production",
  developmentHours: 500, hourlyRate: 50, monthlyRevenue: 0, monthlyProfit: 0,
  revenueType: "No revenue", revenueHistory: "No revenue", revenueTrend: "Stable",
  quality: { codeQuality: "Good", architecture: "Good", documentation: "Basic", testCoverage: "Basic", uiUx: "Good", deploymentReadiness: "Good" },
  assets: { domain: false, documentation: false, automatedTests: false, ciCd: false, liveDemo: false, customers: false, brand: false },
  risks: { technicalDebt: false, licensing: false, keyPerson: false },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Defensively normalize even runtime inputs from untyped callers. No coercion of strings/booleans. */
export function normalizeInput(raw: ValuationInput): { input: ValuationInput; notes: string[] } {
  const notes: string[] = [];
  const input = structuredClone(DEFAULT_INPUT);
  const source = raw ?? DEFAULT_INPUT;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const value = source[key];
    input[key] = typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, LIMITS[key]) : 0;
    if (value !== input[key]) notes.push(`${key} was limited to a finite value between 0 and ${LIMITS[key]}.`);
  }
  function choice<T extends string>(value: T, options: readonly T[], fallback: T, label: string): T {
    if (options.includes(value)) return value;
    notes.push(`${label} was invalid; the default was used.`);
    return fallback;
  }
  input.projectType = choice(source.projectType, PROJECT_TYPES, DEFAULT_INPUT.projectType, "Project type");
  input.projectAge = choice(source.projectAge, PROJECT_AGES, DEFAULT_INPUT.projectAge, "Project age");
  input.developmentStatus = choice(source.developmentStatus, Object.keys(STATUS_FACTORS) as ValuationInput["developmentStatus"][], DEFAULT_INPUT.developmentStatus, "Development status");
  input.revenueType = choice(source.revenueType, Object.keys(REVENUE_TYPE_FACTORS) as ValuationInput["revenueType"][], DEFAULT_INPUT.revenueType, "Revenue type");
  input.revenueHistory = choice(source.revenueHistory, Object.keys(HISTORY_FACTORS) as ValuationInput["revenueHistory"][], DEFAULT_INPUT.revenueHistory, "Revenue history");
  input.revenueTrend = choice(source.revenueTrend, Object.keys(TREND_FACTORS) as ValuationInput["revenueTrend"][], DEFAULT_INPUT.revenueTrend, "Revenue trend");
  for (const key of Object.keys(QUALITY_LABELS) as (keyof typeof QUALITY_LABELS)[]) {
    input.quality[key] = choice(source.quality?.[key], Object.keys(QUALITY_FACTORS) as ValuationInput["quality"][typeof key][], DEFAULT_INPUT.quality[key], key);
  }
  for (const key of Object.keys(ASSET_BONUSES) as (keyof typeof ASSET_BONUSES)[]) input.assets[key] = source.assets?.[key] === true;
  for (const key of Object.keys(RISK_DISCOUNTS) as (keyof typeof RISK_DISCOUNTS)[]) input.risks[key] = source.risks?.[key] === true;
  if (input.monthlyRevenue === 0) {
    if (input.monthlyProfit > 0) notes.push("Profit without revenue was reset to zero.");
    input.monthlyProfit = 0;
    input.revenueType = "No revenue";
    input.revenueHistory = "No revenue";
  } else {
    if (input.monthlyProfit > input.monthlyRevenue) {
      notes.push("Monthly profit was capped at monthly revenue.");
      input.monthlyProfit = input.monthlyRevenue;
    }
    if (input.revenueType === "No revenue") {
      notes.push("Positive revenue with no revenue type was treated conservatively as one-time revenue.");
      input.revenueType = "One-time";
    }
    if (input.revenueHistory === "No revenue") {
      notes.push("Positive revenue without history was treated as less than 3 months of history.");
      input.revenueHistory = "less than 3 months";
    }
  }
  return { input, notes };
}

/** Revenue fallback is a floor for low-margin businesses, never added on top of profit value. */
export function calculateBusinessValue(input: ValuationInput) {
  if (input.monthlyRevenue === 0) return { value: 0, method: "none" as const, profitMultiple: 0, revenueMultiple: 0 };
  const factors = REVENUE_TYPE_FACTORS[input.revenueType] * HISTORY_FACTORS[input.revenueHistory] * TREND_FACTORS[input.revenueTrend];
  const profitMultiple = clamp(MODEL.baseProfitMultiple * factors, MODEL.minProfitMultiple, MODEL.maxProfitMultiple);
  const revenueMultiple = clamp(MODEL.baseRevenueMultiple * factors, MODEL.minRevenueMultiple, MODEL.maxRevenueMultiple);
  const profitValue = input.monthlyProfit * MODEL.monthsPerYear * profitMultiple;
  const revenueValue = input.monthlyRevenue * MODEL.monthsPerYear * revenueMultiple;
  return { value: Math.max(profitValue, revenueValue), method: profitValue >= revenueValue ? "profit" as const : "revenue" as const, profitMultiple, revenueMultiple };
}

export function calculateValuation(raw: ValuationInput): ValuationResult {
  const { input, notes } = normalizeInput(raw);
  const replacementCost = input.developmentHours * input.hourlyRate;
  const ratings = Object.values(input.quality);
  const qualityFactor = ratings.reduce((sum, level) => sum + QUALITY_FACTORS[level], 0) / ratings.length;
  const baseAssetValue = replacementCost * STATUS_FACTORS[input.developmentStatus] * qualityFactor;
  const assetBonusRate = Math.min(MODEL.maxAssetBonus, (Object.keys(ASSET_BONUSES) as (keyof typeof ASSET_BONUSES)[]).reduce((sum, key) => sum + (input.assets[key] ? ASSET_BONUSES[key] : 0), 0));
  // Bonuses increase only standalone assets, never the business valuation.
  const assetAdjustment = baseAssetValue * assetBonusRate;
  const adjustedAssetValue = baseAssetValue + assetAdjustment;
  const business = calculateBusinessValue(input);
  const weightedAssetValue = adjustedAssetValue * MODEL.businessAssetWeight;
  // Meaningful business evidence: business + 20% assets reaches the standalone asset
  // floor. Below this crossover, use assets alone and add no separate business amount.
  // The crossover is continuous and introduces no arbitrary revenue/dollar threshold.
  const valuationBasis = business.value > 0 && business.value + weightedAssetValue >= adjustedAssetValue ? "business" as const : "asset" as const;
  const assetContributionRate = valuationBasis === "business" ? MODEL.businessAssetWeight : 0;
  const assetContribution = valuationBasis === "business" ? weightedAssetValue : 0;
  const combinedValue = valuationBasis === "business" ? business.value + assetContribution : adjustedAssetValue;
  const riskDiscountRate = Math.min(MODEL.maxRiskDiscount, (Object.keys(RISK_DISCOUNTS) as (keyof typeof RISK_DISCOUNTS)[]).reduce((sum, key) => sum + (input.risks[key] ? RISK_DISCOUNTS[key] : 0), 0));
  // All three documented transfer risks retain their whole-project scope and rates.
  const riskAdjustment = riskDiscountRate === 0 ? 0 : -combinedValue * riskDiscountRate;
  const estimate = Math.max(0, combinedValue + riskAdjustment);
  const confidence = calculateConfidence(input);
  const width = CONFIDENCE.widths[confidence.level];
  // Use one rounding step for the entire range to preserve its ordering.
  const step = MODEL.rounding.find(rule => estimate >= rule.minimum)!.step;
  const round = (value: number) => Math.round(value / step) * step;
  const result = {
    lowEstimate: round(estimate * (1 - width)), midpoint: round(estimate), highEstimate: round(estimate * (1 + width)),
    confidence: confidence.level, confidenceScore: confidence.score, confidenceReasons: confidence.reasons,
    replacementCost, qualityFactor, baseAssetValue, adjustedAssetValue, businessValue: business.value, businessMethod: business.method,
    adjustedProfitMultiple: business.profitMultiple, adjustedRevenueMultiple: business.revenueMultiple,
    valuationBasis, assetContributionRate, assetContribution, combinedValue, assetBonusRate, riskDiscountRate, assetAdjustment, riskAdjustment,
    unroundedMidpoint: estimate,
    validationNotes: notes,
  };
  return { ...result, ...explainValuation(input, result) };
}
