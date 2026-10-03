import assert from "node:assert/strict";
import test from "node:test";
import { calculateValuation, DEFAULT_INPUT, normalizeInput, MODEL, CONFIDENCE, LIMITS, type ValuationInput, type ValuationResult } from "../src";

const project = (patch: Partial<ValuationInput> = {}): ValuationInput => ({ ...structuredClone(DEFAULT_INPUT), ...patch });

test("public API preserves defaults and returns a fresh, typed deterministic result", () => {
  const source = project();
  const normalized = normalizeInput(source);
  const result: ValuationResult = calculateValuation(source);
  assert.deepEqual(normalized.input, source);
  assert.deepEqual(normalized.notes, []);
  assert.equal(result.midpoint, 12500);
  assert.deepEqual(result, calculateValuation(source));
  assert.notEqual(result, calculateValuation(source));
});

test("mixed revenue selects the profit method and medium-confidence business range", () => {
  const result = calculateValuation(project({ monthlyRevenue: 2000, monthlyProfit: 1000, revenueType: "Mixed", revenueHistory: "6–12 months" }));
  assert.equal(result.adjustedProfitMultiple, 2.5);
  assert.equal(result.businessValue, 30000);
  assert.equal(result.businessMethod, "profit");
  assert.equal(result.midpoint, 32500);
  assert.equal(result.confidence, "Medium");
  assert.equal(result.confidenceScore, 60);
  assert.deepEqual([result.lowEstimate, result.highEstimate], [24500, 40500]);
});

test("short and long revenue history produce exact adjusted multiples", () => {
  const source = project({ monthlyRevenue: 2000, monthlyProfit: 1000, revenueType: "Mixed" });
  const short = calculateValuation({ ...source, revenueHistory: "less than 3 months" });
  const long = calculateValuation({ ...source, revenueHistory: "12+ months" });
  assert.equal(short.adjustedProfitMultiple, 1.875);
  assert.equal(short.businessValue, 22500);
  assert.equal(short.confidenceScore, 40);
  assert.equal(long.adjustedProfitMultiple, 2.875);
  assert.equal(long.businessValue, 34500);
  assert.equal(long.confidenceScore, 70);
});

test("key-person dependency discounts the entire combined value without a confidence penalty", () => {
  const source = project({ monthlyRevenue: 5000, monthlyProfit: 2000, revenueType: "Recurring", revenueHistory: "12+ months" });
  const baseline = calculateValuation(source);
  const risky = calculateValuation({ ...source, risks: { ...source.risks, keyPerson: true } });
  assert.equal(risky.riskDiscountRate, 0.15);
  assert.equal(risky.riskAdjustment, -baseline.combinedValue * 0.15);
  assert.equal(risky.confidenceScore, baseline.confidenceScore);
});

test("confidence classification includes exact 45 and 75 boundaries", () => {
  const medium = project({ monthlyRevenue: 2000, monthlyProfit: 1000, revenueType: "One-time", revenueHistory: "3–6 months" });
  medium.quality.documentation = "Good";
  medium.assets.customers = true;
  medium.risks.licensing = true;
  const result = calculateValuation(medium);
  assert.equal(result.confidenceScore, CONFIDENCE.mediumThreshold);
  assert.equal(result.confidence, "Medium");
  const high = { ...medium, revenueType: "Recurring" as const, revenueHistory: "12+ months" as const };
  const highResult = calculateValuation(high);
  assert.equal(highResult.confidenceScore, CONFIDENCE.highThreshold);
  assert.equal(highResult.confidence, "High");
});

test("rounding step is selected from the raw midpoint and shared across all endpoints", () => {
  for (const [raw, step] of [[0, 1], [99.5, 1], [100, 10], [999.5, 10], [1000, 100], [9999.5, 100], [10000, 500], [99999.5, 500], [100000, 1000], [100001.5, 1000]]) {
    const result = calculateValuation(project({ developmentHours: raw / 5, hourlyRate: 10 }));
    assert.equal(result.unroundedMidpoint, raw);
    assert.equal(result.midpoint, Math.round(raw / step) * step);
    assert.equal(result.lowEstimate, Math.round(raw * 0.65 / step) * step);
    assert.equal(result.highEstimate, Math.round(raw * 1.35 / step) * step);
  }
});

test("exact input maxima and over-limit inputs yield the same finite output", () => {
  const bounded = project(LIMITS);
  const extreme = project(Object.fromEntries(Object.keys(LIMITS).map(key => [key, Number.MAX_VALUE])));
  const exact = calculateValuation(bounded);
  const normalized = calculateValuation(extreme);
  for (const [key, value] of Object.entries(exact)) {
    if (key !== "validationNotes") assert.deepEqual(normalized[key as keyof ValuationResult], value);
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
  assert.equal(exact.replacementCost, 100000000);
  assert.equal(MODEL.maxAssetBonus, 0.06);
  assert.equal(MODEL.maxRiskDiscount, 0.55);
  assert.equal(MODEL.businessAssetWeight, 0.20);
});
