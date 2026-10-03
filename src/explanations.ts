import { ASSET_BONUSES, ASSET_LABELS, MODEL, RISK_DISCOUNTS, RISK_LABELS, RISK_REASONS } from "./constants";
import type { ValuationInput, ValuationResult } from "./types";

export function explainValuation(input: ValuationInput, result: Pick<ValuationResult, "businessMethod" | "valuationBasis" | "adjustedProfitMultiple" | "adjustedRevenueMultiple" | "qualityFactor">) {
  const strengths: string[] = [];
  const risks: string[] = [];
  const explanations = [
    "Replacement cost is development hours × replacement hourly rate. It is a rebuild estimate, not market value.",
    `Standalone source-code value applies the development status factor and average quality factor (${result.qualityFactor.toFixed(2)}).`,
    "Project type and age describe the project; they do not add unsupported category or age premiums. Revenue history measures business evidence separately.",
    `Domain, customer and brand bonuses apply only to the base asset value and are capped at ${MODEL.maxAssetBonus * 100}% in total. They do not increase the business multiple or business value.`,
    "Documentation, tests and deployment readiness are already captured in quality. Documentation, automated tests and CI/CD checkboxes add no extra percentage bonus. A live demo helps buyers assess the project but adds no price premium.",
    `Risk discounts apply to the combined project valuation after assets and business have been combined, capped at ${Math.round(MODEL.maxRiskDiscount * 100)}% in total.`,
  ];
  if (result.businessMethod === "none") {
    risks.push("No demonstrated revenue: value depends mainly on transferable software and buyer demand.");
    explanations.push("With no revenue, the standalone asset value supplies the estimate; no business multiple is applied.");
  } else {
    explanations.push(result.businessMethod === "profit"
      ? `Business value uses annual profit × ${result.adjustedProfitMultiple.toFixed(2)}, adjusted for revenue type, history and trend.`
      : `Low or zero profit uses a conservative annual revenue × ${result.adjustedRevenueMultiple.toFixed(2)} fallback. This is a model assumption, not evidence of a profitable business.`);
    if (input.revenueType === "Recurring") strengths.push("Recurring revenue increases the business multiple.");
    if (input.revenueTrend === "Growing") strengths.push("Growing revenue increases the business multiple.");
    if (input.revenueTrend === "Declining") risks.push("Declining revenue reduces the business multiple.");
    if (input.revenueHistory === "less than 3 months") risks.push("Short revenue history reduces the business multiple.");
    if (input.revenueHistory === "12+ months") strengths.push("Longer revenue history supports the business multiple.");
    if (result.businessMethod === "revenue") risks.push("Limited profitability: the revenue fallback is deliberately conservative.");
  }
  explanations.push(result.valuationBasis === "business"
    ? `Business value plus ${MODEL.businessAssetWeight * 100}% of adjusted asset value reaches the standalone asset estimate. The business estimate therefore adds only that partial asset contribution to avoid double counting.`
    : "The estimate uses the adjusted standalone asset value. Business value plus a partial asset contribution does not exceed this asset estimate, so no separate business amount is added.");
  if (result.qualityFactor > 1) strengths.push("Above-average quality increases standalone asset value.");
  if (result.qualityFactor < 1) risks.push("Lower quality reduces standalone asset value.");
  for (const key of Object.keys(ASSET_BONUSES) as (keyof typeof ASSET_BONUSES)[]) {
    if (input.assets[key] && ASSET_BONUSES[key] > 0) strengths.push(`${ASSET_LABELS[key]}: contributes ${ASSET_BONUSES[key] * 100}% to base asset value before the aggregate cap.`);
  }
  if (input.assets.documentation) strengths.push("Documentation included: supports buyer handover; its quality is already rated, so no additional bonus is applied.");
  if (input.assets.automatedTests) strengths.push("Automated tests included: support verification; test coverage is already rated, so no additional bonus is applied.");
  if (input.assets.ciCd) strengths.push("CI/CD configured: supports deployment; deployment readiness is already rated, so no additional bonus is applied.");
  if (input.assets.liveDemo) strengths.push("Live demo available: helps buyers assess the project; no additional bonus is applied.");
  for (const key of Object.keys(RISK_DISCOUNTS) as (keyof typeof RISK_DISCOUNTS)[]) {
    if (input.risks[key]) risks.push(`${RISK_LABELS[key]}: contributes a ${RISK_DISCOUNTS[key] * 100}% whole-project discount before the aggregate cap. ${RISK_REASONS[key]}`);
  }
  return { strengths, risks, explanations };
}
