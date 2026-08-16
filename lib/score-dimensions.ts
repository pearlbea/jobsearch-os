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
  },
  domain: {
    fullKey: "domain_match",
    label: "Domain Match",
    description:
      "How closely the candidate's industry and business-domain experience aligns with this role.",
  },
  scope: {
    fullKey: "leadership_match",
    label: "Leadership / Scope",
    description:
      "How well the candidate's level of responsibility — team size managed, decision-making authority, IC vs. management track — matches what this role requires, evaluated independently of technical or domain fit.",
  },
} as const;
