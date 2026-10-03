/** Model assumptions, not market benchmarks or professional appraisal data. All money is USD. */
export const PROJECT_TYPES = ["SaaS", "Web App", "Mobile App", "Plugin", "Script", "Boilerplate", "Other"] as const;
export const PROJECT_AGES = ["less than 3 months", "3–6 months", "6–12 months", "1–2 years", "2+ years"] as const;
export const STATUS_FACTORS = { Prototype: 0.20, MVP: 0.35, Production: 0.50 } as const;
export const QUALITY_FACTORS = { Poor: 0.70, Basic: 0.90, Good: 1.05, Excellent: 1.15 } as const;
export const QUALITY_LABELS = {
  codeQuality: "Code quality", architecture: "Architecture", documentation: "Documentation",
  testCoverage: "Test coverage", uiUx: "UI/UX", deploymentReadiness: "Deployment readiness",
} as const;
export const REVENUE_TYPE_FACTORS = { "No revenue": 0, "One-time": 0.80, Mixed: 1, Recurring: 1.20 } as const;
export const HISTORY_FACTORS = { "No revenue": 0, "less than 3 months": 0.75, "3–6 months": 0.85, "6–12 months": 1, "12+ months": 1.15 } as const;
export const TREND_FACTORS = { Declining: 0.80, Stable: 1, Growing: 1.15 } as const;
export const ASSET_BONUSES = {
  // Quality already covers documentation, testing and deployment readiness.
  // A demo helps buyers inspect the project but receives no price premium.
  domain: 0.02, documentation: 0, automatedTests: 0, ciCd: 0,
  liveDemo: 0, customers: 0.04, brand: 0.02,
} as const;
export const ASSET_LABELS = {
  domain: "Domain included", documentation: "Documentation included", automatedTests: "Automated tests included",
  ciCd: "CI/CD configured", liveDemo: "Live demo available", customers: "Existing users/customers", brand: "Brand/design assets included",
} as const;
export const RISK_DISCOUNTS = { technicalDebt: 0.20, licensing: 0.30, keyPerson: 0.15 } as const;
/** Phase 1.1 retains the percentages and whole-project scope, with distinct reasons. */
export const RISK_REASONS = {
  technicalDebt: "Remediation can interrupt operations and require future spending beyond the costs in current profit and the quality rating.",
  licensing: "Uncertain rights can prevent transfer or continued operation of both the software and its business.",
  keyPerson: "Reliance on one person can impair software maintenance, customer continuity and handover to a buyer.",
} as const;
export const RISK_LABELS = {
  technicalDebt: "Significant technical debt", licensing: "Third-party licensing concerns", keyPerson: "High key-person dependency",
} as const;
export const MODEL = {
  monthsPerYear: 12, baseProfitMultiple: 2.5, minProfitMultiple: 1, maxProfitMultiple: 4.5,
  // Conservative annual revenue multiple; used as a floor when profit-based value is lower.
  baseRevenueMultiple: 0.35, minRevenueMultiple: 0.10, maxRevenueMultiple: 0.60,
  businessAssetWeight: 0.20, maxAssetBonus: 0.06, maxRiskDiscount: 0.55,
  rounding: [{ minimum: 100000, step: 1000 }, { minimum: 10000, step: 500 }, { minimum: 1000, step: 100 }, { minimum: 100, step: 10 }, { minimum: 0, step: 1 }],
} as const;
export const LIMITS = { developmentHours: 100000, hourlyRate: 1000, monthlyRevenue: 10000000, monthlyProfit: 10000000 } as const;
export const CONFIDENCE = {
  initial: 35, production: 15, prototype: -15, recurring: 10, longHistory: 20,
  mediumHistory: 10, shortHistory: -10, noRevenue: -20, customers: 10,
  documentation: 10, licensing: -25, technicalDebt: -15, maxScore: 90, highThreshold: 75, mediumThreshold: 45,
  widths: { High: 0.15, Medium: 0.25, Low: 0.35 },
} as const;
