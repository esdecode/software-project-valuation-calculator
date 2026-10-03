import { calculateValuation, DEFAULT_INPUT, type ValuationInput } from "../src";

// Reviewed scenario B: a small, profitable recurring SaaS.
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
  midpoint: result.midpoint,
  lowEstimate: result.lowEstimate,
  highEstimate: result.highEstimate,
  confidence: result.confidence,
  businessValue: result.businessValue,
  adjustedAssetValue: result.adjustedAssetValue,
});
