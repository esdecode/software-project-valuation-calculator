/** Public entry point; calculation normalizes inputs before applying the fixed model. */
export { calculateValuation, DEFAULT_INPUT, normalizeInput } from "./calculate";
export type { ValuationInput, ValuationResult, ConfidenceLevel } from "./types";
/** Read-only TypeScript constants for model inspection, not a configuration override API. */
export { MODEL, CONFIDENCE, LIMITS, STATUS_FACTORS, QUALITY_FACTORS, REVENUE_TYPE_FACTORS, HISTORY_FACTORS, TREND_FACTORS, ASSET_BONUSES, RISK_DISCOUNTS } from "./constants";
