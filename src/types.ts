import type { ASSET_BONUSES, HISTORY_FACTORS, PROJECT_AGES, PROJECT_TYPES, QUALITY_FACTORS, QUALITY_LABELS, REVENUE_TYPE_FACTORS, RISK_DISCOUNTS, STATUS_FACTORS, TREND_FACTORS } from "./constants";

export interface ValuationInput {
  projectType: typeof PROJECT_TYPES[number];
  projectAge: typeof PROJECT_AGES[number];
  developmentStatus: keyof typeof STATUS_FACTORS;
  developmentHours: number;
  hourlyRate: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  revenueType: keyof typeof REVENUE_TYPE_FACTORS;
  revenueHistory: keyof typeof HISTORY_FACTORS;
  revenueTrend: keyof typeof TREND_FACTORS;
  quality: Record<keyof typeof QUALITY_LABELS, keyof typeof QUALITY_FACTORS>;
  assets: Record<keyof typeof ASSET_BONUSES, boolean>;
  risks: Record<keyof typeof RISK_DISCOUNTS, boolean>;
}
export type ConfidenceLevel = "High" | "Medium" | "Low";
export interface ValuationResult {
  lowEstimate: number;
  midpoint: number;
  highEstimate: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
  replacementCost: number;
  qualityFactor: number;
  /** Discounted replacement value, before transferable-asset bonuses. */
  baseAssetValue: number;
  /** Base asset value plus assetAdjustment; before whole-project risks. */
  adjustedAssetValue: number;
  businessValue: number;
  businessMethod: "none" | "profit" | "revenue";
  adjustedProfitMultiple: number;
  adjustedRevenueMultiple: number;
  /** True when business value plus the weighted asset value reaches the asset floor. */
  valuationBasis: "asset" | "business";
  assetContributionRate: number;
  /** Only the weighted asset amount added on the business basis; zero on asset basis. */
  assetContribution: number;
  combinedValue: number;
  assetBonusRate: number;
  riskDiscountRate: number;
  assetAdjustment: number;
  riskAdjustment: number;
  /** Combined value plus riskAdjustment, before range/midpoint rounding. */
  unroundedMidpoint: number;
  strengths: string[];
  risks: string[];
  explanations: string[];
  validationNotes: string[];
}
