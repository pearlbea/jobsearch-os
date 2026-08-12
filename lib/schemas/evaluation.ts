import { z } from "zod";

// Short keys reduce completion token overhead by ~40%
export const compactEvaluationSchema = z.object({
  co: z.string().describe("Company name"),
  title: z.string().describe("Official job title"),
  remote: z.boolean().describe("Is fully remote"),
  score: z.number().min(0).max(100).describe("0-100 match score"),
  breakdown: z.object({
    tech: z.number().min(0).max(100),
    domain: z.number().min(0).max(100),
    scope: z.number().min(0).max(100),
  }),
  ats_analysis: z.object({
    missing_exact_keywords: z
      .array(z.string())
      .describe(
        "High-importance exact keywords/phrases in the JD that are completely missing from the resume",
      ),
    formatting_warnings: z
      .array(z.string())
      .describe(
        "Any structural or clarity issues in the resume text (e.g. non-standard job titles, missing dates)",
      ),
    ats_pass_probability: z
      .enum(["High", "Medium", "Low"])
      .describe("Likelihood of passing an automated ATS keyword filter"),
  }),
  strengths: z
    .array(z.string())
    .max(3)
    .describe("Top 2-3 key match points (concise)"),
  gaps: z
    .array(z.string())
    .max(2)
    .describe("Top 1-2 missing skills/qualifications"),
  advice: z.string().describe("1-sentence positioning strategy"),
  skills: z
    .array(z.string())
    .max(6)
    .describe("Top 6 extracted tech requirements"),
});

export type CompactEvaluation = z.infer<typeof compactEvaluationSchema>;
