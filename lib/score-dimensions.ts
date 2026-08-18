// Single source of truth for the three score-breakdown dimensions: the
// compact key the model returns, the full DB field it's mapped to, the
// human-readable label, and what the dimension measures. Referenced by the
// evaluation schema (model-facing description), the evaluation prompt
// (field names), the compact->full mapping, and the score tooltip — so a
// rename or reworded definition only has to happen here.
export const SCORE_DIMENSIONS = {
  tech: {
    fullKey: "technical_match",
    label: "Technical Match",
    description:
      "How well the candidate's hands-on tools, languages, and frameworks match what the role requires.",
    weight: 0.33,
  },
  domain: {
    fullKey: "domain_match",
    label: "Domain Match",
    description:
      "How closely the candidate's industry and business-domain experience aligns with this role.",
    weight: 0.33,
  },
  scope: {
    fullKey: "leadership_match",
    label: "Leadership / Scope",
    description:
      "How well the candidate's level of responsibility — team size managed, decision-making authority, IC vs. management track — matches what this role requires, evaluated independently of technical or domain fit.",
    weight: 0.34,
  },
} as const;

// The overall match score is a straight weighted average of the three
// breakdown dimensions (see SCORE_DIMENSIONS[key].weight) rather than a
// number the model invents separately — this keeps the headline score
// mechanically consistent with the breakdown shown to the user.
export function computeMatchScore(breakdown: Record<keyof typeof SCORE_DIMENSIONS, number>): number {
  const weightedSum = (Object.keys(SCORE_DIMENSIONS) as (keyof typeof SCORE_DIMENSIONS)[]).reduce(
    (sum, key) => sum + breakdown[key] * SCORE_DIMENSIONS[key].weight,
    0,
  );
  return Math.round(weightedSum);
}
