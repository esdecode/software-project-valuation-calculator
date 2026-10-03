import { CONFIDENCE as C } from "./constants";
import type { ConfidenceLevel, ValuationInput } from "./types";

/** Confidence reflects evidence supplied by the user; it is not a statistical probability. */
export function calculateConfidence(input: ValuationInput) {
  let score: number = C.initial;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => { score += points; reasons.push(reason); };
  if (input.developmentStatus === "Production") add(C.production, "Production readiness improves confidence.");
  if (input.developmentStatus === "Prototype") add(C.prototype, "Prototype status leaves delivery uncertainty.");
  if (input.monthlyRevenue === 0) add(C.noRevenue, "No revenue evidence limits confidence in buyer demand.");
  else {
    if (input.revenueType === "Recurring") add(C.recurring, "Recurring revenue provides more predictable evidence.");
    if (input.revenueHistory === "12+ months") add(C.longHistory, "At least 12 months of revenue improves confidence.");
    else if (input.revenueHistory === "6–12 months") add(C.mediumHistory, "Six or more months of revenue improves confidence.");
    else if (input.revenueHistory === "less than 3 months") add(C.shortHistory, "Very short revenue history increases uncertainty.");
  }
  if (input.assets.customers) add(C.customers, "Existing users or customers provide adoption evidence.");
  if (["Good", "Excellent"].includes(input.quality.documentation)) add(C.documentation, "Good documentation makes the project easier to assess.");
  if (input.risks.licensing) add(C.licensing, "Licensing concerns make transferability uncertain.");
  if (input.risks.technicalDebt) add(C.technicalDebt, "Technical debt makes future maintenance costs uncertain.");
  score = Math.max(0, Math.min(C.maxScore, score));
  const level: ConfidenceLevel = score >= C.highThreshold ? "High" : score >= C.mediumThreshold ? "Medium" : "Low";
  return { score, level, reasons };
}
