import assert from "node:assert/strict";
import test from "node:test";
import { calculateValuation, DEFAULT_INPUT, normalizeInput } from "../src/calculate";
import { ASSET_BONUSES, CONFIDENCE, LIMITS, MODEL, RISK_DISCOUNTS } from "../src/constants";
import type { ValuationInput } from "../src/types";

const scenario = (patch: Partial<ValuationInput> = {}) => ({ ...structuredClone(DEFAULT_INPUT), ...patch });
const recurring = () => scenario({ monthlyRevenue: 5000, monthlyProfit: 2000, revenueType: "Recurring", revenueHistory: "12+ months", assets: { ...DEFAULT_INPUT.assets, customers: true }, quality: { ...DEFAULT_INPUT.quality, documentation: "Good" } });
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≠ ${expected}`);

test("zero-revenue production: exact rebuild, discounted asset, and low-confidence range", () => {
  const r = calculateValuation(scenario());
  assert.equal(r.replacementCost, 25000);
  close(r.qualityFactor, 1);
  close(r.adjustedAssetValue, 12500);
  assert.equal(r.businessValue, 0);
  assert.equal(r.businessMethod, "none");
  assert.equal(r.baseAssetValue, 12500);
  assert.equal(r.assetContribution, 0);
  assert.equal(r.valuationBasis, "asset");
  assert.equal(r.confidence, "Low");
  assert.deepEqual([r.lowEstimate, r.midpoint, r.highEstimate], [8000, 12500, 17000]);
});

test("prototype with no revenue has a lower asset factor and confidence", () => {
  const r = calculateValuation(scenario({ developmentStatus: "Prototype" }));
  close(r.adjustedAssetValue, 5000);
  assert.equal(r.confidenceScore, 0);
  assert.equal(r.confidence, "Low");
  assert.deepEqual([r.lowEstimate, r.midpoint, r.highEstimate], [3300, 5000, 6800]);
});

test("profitable recurring SaaS adds only 20% of source-code value", () => {
  const input = recurring();
  const r = calculateValuation(input);
  close(r.adjustedProfitMultiple, 3.45);
  close(r.businessValue, 82800);
  close(r.assetContribution, r.adjustedAssetValue * 0.2);
  close(r.combinedValue, r.businessValue + r.assetContribution);
  assert.ok(r.combinedValue < r.businessValue + r.adjustedAssetValue);
  assert.equal(r.businessMethod, "profit");
  assert.equal(r.confidence, "High");
});

test("one-time revenue uses the discounted multiple", () => {
  const r = calculateValuation({ ...recurring(), revenueType: "One-time", revenueHistory: "6–12 months" });
  assert.equal(r.adjustedProfitMultiple, 2);
  assert.equal(r.businessValue, 48000);
});

test("growing recurring and declining projects change business value deterministically", () => {
  const input = recurring();
  const stable = calculateValuation(input);
  const growing = calculateValuation({ ...input, revenueTrend: "Growing" });
  const declining = calculateValuation({ ...input, revenueTrend: "Declining" });
  close(growing.businessValue, 95220);
  close(declining.businessValue, 66240);
  assert.ok(growing.midpoint > stable.midpoint && stable.midpoint > declining.midpoint);
});

test("excellent and poor quality use all six ratings equally", () => {
  for (const [rating, factor] of [["Excellent", 1.15], ["Poor", 0.70]] as const) {
    const input = scenario();
    for (const key of Object.keys(input.quality) as (keyof ValuationInput["quality"])[]) input.quality[key] = rating;
    close(calculateValuation(input).adjustedAssetValue, 12500 * factor);
  }
});

test("licensing is a stronger discount than technical debt; both reduce confidence", () => {
  const input = recurring();
  const base = calculateValuation(input);
  const licensing = calculateValuation({ ...input, risks: { ...input.risks, licensing: true } });
  const debt = calculateValuation({ ...input, risks: { ...input.risks, technicalDebt: true } });
  assert.equal(licensing.riskDiscountRate, 0.30);
  assert.equal(debt.riskDiscountRate, 0.20);
  close(licensing.riskAdjustment, -base.combinedValue * 0.30);
  assert.ok(licensing.midpoint < debt.midpoint && debt.midpoint < base.midpoint);
  assert.ok(licensing.confidenceScore < debt.confidenceScore && debt.confidenceScore < base.confidenceScore);
  assert.ok(licensing.risks.some(reason => reason.includes("licensing")));
});

test("aggregate bonuses and risks stop at their caps and risks apply after bonuses", () => {
  const input = scenario();
  for (const key of Object.keys(ASSET_BONUSES) as (keyof typeof ASSET_BONUSES)[]) input.assets[key] = true;
  for (const key of Object.keys(RISK_DISCOUNTS) as (keyof typeof RISK_DISCOUNTS)[]) input.risks[key] = true;
  const r = calculateValuation(input);
  assert.equal(r.assetBonusRate, MODEL.maxAssetBonus);
  assert.equal(r.riskDiscountRate, MODEL.maxRiskDiscount);
  close(r.assetAdjustment, 750);
  close(r.adjustedAssetValue, 13250);
  close(r.riskAdjustment, -7287.5);
  assert.equal(r.midpoint, 6000);
});

test("zero and little profit get the conservative revenue floor, not zero business value", () => {
  for (const monthlyProfit of [0, 1, 100]) {
    const r = calculateValuation({ ...recurring(), monthlyProfit });
    assert.equal(r.businessMethod, "revenue");
    close(r.adjustedRevenueMultiple, 0.483);
    close(r.businessValue, 28980);
  }
});

test("an asset-heavy project keeps its asset floor without adding full assets to business value", () => {
  const r = calculateValuation(scenario({ monthlyRevenue: 100, monthlyProfit: 0, revenueType: "One-time", revenueHistory: "less than 3 months" }));
  close(r.businessValue, 252);
  close(r.combinedValue, 12500);
  close(r.assetContribution, 0);
  assert.equal(r.assetContributionRate, 0);
  assert.equal(r.valuationBasis, "asset");
});

test("low, medium and high confidence determine rounded range widths", () => {
  const low = scenario();
  const medium = scenario({ monthlyRevenue: 2000, monthlyProfit: 1000, revenueType: "One-time", revenueHistory: "6–12 months" });
  const high = recurring();
  for (const [input, level, step] of [[low, "Low", 500], [medium, "Medium", 500], [high, "High", 500]] as const) {
    const r = calculateValuation(input);
    assert.equal(r.confidence, level);
    const rawMid = r.unroundedMidpoint;
    assert.equal(r.lowEstimate, Math.round(rawMid * (1 - CONFIDENCE.widths[level]) / step) * step);
    assert.equal(r.highEstimate, Math.round(rawMid * (1 + CONFIDENCE.widths[level]) / step) * step);
    assert.ok(r.lowEstimate <= r.midpoint && r.midpoint <= r.highEstimate);
  }
});

test("missing revenue history is conservative and short history lowers confidence", () => {
  const input = { ...recurring(), revenueHistory: "No revenue" as const };
  const normalized = normalizeInput(input);
  assert.equal(normalized.input.revenueHistory, "less than 3 months");
  assert.ok(normalized.notes.length > 0);
  assert.ok(calculateValuation(input).confidenceScore < calculateValuation(recurring()).confidenceScore);
});

test("profit multiple bounds hold for weakest and strongest supplied factors", () => {
  const weak = calculateValuation({ ...recurring(), revenueType: "One-time", revenueHistory: "less than 3 months", revenueTrend: "Declining" });
  close(weak.adjustedProfitMultiple, 1.2);
  const strong = calculateValuation({ ...recurring(), revenueTrend: "Growing" });
  assert.ok(strong.adjustedProfitMultiple <= MODEL.maxProfitMultiple);
  assert.ok(weak.adjustedProfitMultiple >= MODEL.minProfitMultiple);
});

test("negative, non-finite, over-limit and contradictory financial inputs stay safe", () => {
  for (const value of [-1, NaN, Infinity, -Infinity, Number.MAX_VALUE]) {
    const input = scenario({ developmentHours: value, hourlyRate: value, monthlyRevenue: value, monthlyProfit: value });
    const r = calculateValuation(input);
    for (const output of Object.values(r)) if (typeof output === "number") assert.ok(Number.isFinite(output));
    assert.ok(r.lowEstimate >= 0);
    assert.ok(r.validationNotes.length > 0);
    assert.ok(r.replacementCost <= LIMITS.developmentHours * LIMITS.hourlyRate);
  }
  const profitOnly = normalizeInput(scenario({ monthlyProfit: 100 }));
  assert.equal(profitOnly.input.monthlyProfit, 0);
  close(calculateValuation(scenario({ monthlyRevenue: 10, monthlyProfit: 100 })).businessValue, 180);
});

test("invalid runtime enum and nested values cannot create NaN or checkbox premiums", () => {
  const invalid = { ...scenario(), developmentStatus: "__proto__", revenueType: "bad", quality: {}, assets: { domain: "true" }, risks: undefined } as unknown as ValuationInput;
  const r = calculateValuation(invalid);
  assert.equal(r.midpoint, 12500);
  assert.equal(r.assetBonusRate, 0);
  assert.ok(r.validationNotes.length > 0);
});

test("all-zero inputs produce an ordered zero range", () => {
  const r = calculateValuation(scenario({ developmentHours: 0, hourlyRate: 0 }));
  assert.deepEqual([r.lowEstimate, r.midpoint, r.highEstimate], [0, 0, 0]);
});

test("calculation is deterministic and never mutates its input", () => {
  const input = recurring();
  const before = structuredClone(input);
  assert.deepEqual(calculateValuation(input), calculateValuation(input));
  assert.deepEqual(input, before);
});

test("bonuses change only assets and their 20% contribution, independent of business scale", () => {
  const input = recurring();
  input.assets.customers = false;
  const base = calculateValuation(input);
  const domain = calculateValuation({ ...input, assets: { ...input.assets, domain: true } });
  close(domain.assetAdjustment, base.baseAssetValue * 0.02);
  close(domain.businessValue, base.businessValue);
  close(domain.combinedValue - base.combinedValue, domain.assetAdjustment * 0.20);
  const larger = calculateValuation({ ...input, monthlyRevenue: 50000, monthlyProfit: 20000, assets: { ...input.assets, domain: true } });
  close(larger.assetAdjustment, domain.assetAdjustment);
  close(larger.assetContribution, domain.assetContribution);
});

test("documentation, tests, CI/CD and live demo are strengths with no extra valuation premium", () => {
  for (const key of ["documentation", "automatedTests", "ciCd", "liveDemo"] as const) {
    const input = recurring();
    const before = calculateValuation(input);
    const after = calculateValuation({ ...input, assets: { ...input.assets, [key]: true } });
    assert.equal(after.assetAdjustment, before.assetAdjustment);
    assert.equal(after.adjustedAssetValue, before.adjustedAssetValue);
    assert.equal(after.unroundedMidpoint, before.unroundedMidpoint);
    assert.ok(after.strengths.some(reason => reason.includes("no additional bonus")));
  }
});

test("confidence is capped at 90 while existing levels and penalties remain effective", () => {
  const r = calculateValuation(recurring());
  assert.equal(r.confidenceScore, 90);
  assert.equal(r.confidence, "High");
  const risky = calculateValuation({ ...recurring(), risks: { ...DEFAULT_INPUT.risks, licensing: true, technicalDebt: true } });
  assert.equal(risky.confidenceScore, 60);
  assert.equal(risky.confidence, "Medium");
});

test("combination switches continuously at the business/asset crossover", () => {
  const input = scenario({ developmentHours: 100, hourlyRate: 50, monthlyRevenue: 100, monthlyProfit: 0, revenueType: "Mixed", revenueHistory: "6–12 months" });
  const below = calculateValuation({ ...input, monthlyProfit: 66 });
  const above = calculateValuation({ ...input, monthlyProfit: 67 });
  assert.equal(below.valuationBasis, "asset");
  assert.equal(above.valuationBasis, "business");
  close(below.combinedValue, 2500);
  close(above.combinedValue, 2510);
  close(above.assetContribution, 500);
});

test("risk discounts retain whole-project scope, independent of valuation basis", () => {
  for (const input of [scenario(), recurring()]) {
    const base = calculateValuation(input);
    for (const key of Object.keys(RISK_DISCOUNTS) as (keyof typeof RISK_DISCOUNTS)[]) {
      const risky = calculateValuation({ ...input, risks: { ...input.risks, [key]: true } });
      close(risky.riskAdjustment, -base.combinedValue * RISK_DISCOUNTS[key]);
      close(risky.unroundedMidpoint, base.combinedValue + risky.riskAdjustment);
      assert.ok(risky.risks.some(reason => reason.includes("whole-project discount")));
    }
  }
});

test("returned breakdown distinguishes the asset calculation and final valuation", () => {
  for (const input of [scenario(), recurring()]) {
    const r = calculateValuation(input);
    close(r.adjustedAssetValue, r.baseAssetValue + r.assetAdjustment);
    close(r.combinedValue, r.valuationBasis === "business" ? r.businessValue + r.assetContribution : r.adjustedAssetValue);
    close(r.unroundedMidpoint, r.combinedValue + r.riskAdjustment);
    if (r.valuationBasis === "business") close(r.assetContribution, r.adjustedAssetValue * r.assetContributionRate);
  }
});

const allGood: ValuationInput["quality"] = { codeQuality: "Good", architecture: "Good", documentation: "Good", testCoverage: "Good", uiUx: "Good", deploymentReadiness: "Good" };
const allAssets: ValuationInput["assets"] = { domain: true, documentation: true, automatedTests: true, ciCd: true, liveDemo: true, customers: true, brand: true };
const calibrationCases: { id: string; input: ValuationInput; expected: { baseAsset: number; adjustedAsset: number; business: number; risk: number; rawMidpoint: number; range: number[]; score: number; basis: "asset" | "business" } }[] = [
  { id: "A", input: scenario({ projectType: "Web App", projectAge: "6–12 months", developmentHours: 800, hourlyRate: 50, quality: { ...allGood, testCoverage: "Basic", deploymentReadiness: "Excellent" }, assets: { ...allAssets, customers: false } }), expected: { baseAsset: 20833.333333333336, adjustedAsset: 21666.666666666668, business: 0, risk: 0, rawMidpoint: 21666.666666666668, range: [14000, 21500, 29500], score: 40, basis: "asset" } },
  { id: "B", input: scenario({ projectType: "SaaS", projectAge: "1–2 years", developmentHours: 1200, hourlyRate: 60, monthlyRevenue: 2000, monthlyProfit: 1200, revenueType: "Recurring", revenueHistory: "12+ months", revenueTrend: "Stable", quality: allGood, assets: allAssets }), expected: { baseAsset: 37800, adjustedAsset: 40068, business: 49680, risk: 0, rawMidpoint: 57693.6, range: [49000, 57500, 66500], score: 90, basis: "business" } },
  { id: "C", input: scenario({ projectType: "SaaS", projectAge: "2+ years", developmentHours: 2500, hourlyRate: 70, monthlyRevenue: 10000, monthlyProfit: 6000, revenueType: "Recurring", revenueHistory: "12+ months", revenueTrend: "Growing", quality: { codeQuality: "Excellent", architecture: "Excellent", documentation: "Good", testCoverage: "Excellent", uiUx: "Good", deploymentReadiness: "Excellent" }, assets: allAssets }), expected: { baseAsset: 97708.33333333331, adjustedAsset: 103570.83333333331, business: 285660, risk: 0, rawMidpoint: 306374.1666666666, range: [260000, 306000, 352000], score: 90, basis: "business" } },
  { id: "D", input: scenario({ projectType: "Plugin", projectAge: "1–2 years", developmentHours: 500, hourlyRate: 50, monthlyRevenue: 1500, monthlyProfit: 1000, revenueType: "One-time", revenueHistory: "6–12 months", revenueTrend: "Stable", quality: allGood, assets: { ...allAssets, ciCd: false } }), expected: { baseAsset: 13125, adjustedAsset: 13912.5, business: 24000, risk: 0, rawMidpoint: 26782.5, range: [23000, 27000, 31000], score: 80, basis: "business" } },
  { id: "E", input: scenario({ projectType: "Web App", projectAge: "2+ years", developmentHours: 1800, hourlyRate: 60, monthlyRevenue: 3000, monthlyProfit: 1000, revenueType: "Mixed", revenueHistory: "12+ months", revenueTrend: "Declining", quality: { codeQuality: "Basic", architecture: "Poor", documentation: "Poor", testCoverage: "Poor", uiUx: "Basic", deploymentReadiness: "Basic" }, assets: { ...allAssets, documentation: false, automatedTests: false, ciCd: false }, risks: { technicalDebt: true, licensing: true, keyPerson: true } }), expected: { baseAsset: 43200, adjustedAsset: 45792, business: 27600, risk: -25185.6, rawMidpoint: 20606.4, range: [13500, 20500, 28000], score: 40, basis: "asset" } },
];

for (const { id, input, expected } of calibrationCases) {
  test(`Phase 1.1 calibration scenario ${id}: assets, business, risks, midpoint and range`, () => {
    const r = calculateValuation(input);
    close(r.baseAssetValue, expected.baseAsset);
    close(r.adjustedAssetValue, expected.adjustedAsset);
    close(r.businessValue, expected.business);
    close(r.riskAdjustment, expected.risk);
    close(r.unroundedMidpoint, expected.rawMidpoint);
    assert.deepEqual([r.lowEstimate, r.midpoint, r.highEstimate], expected.range);
    assert.equal(r.confidenceScore, expected.score);
    assert.equal(r.valuationBasis, expected.basis);
    assert.deepEqual(r.validationNotes, []);
  });
}
