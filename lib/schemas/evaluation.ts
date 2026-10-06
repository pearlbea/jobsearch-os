import { z } from "zod";
import { SCORE_DIMENSIONS } from "@/lib/score-dimensions";

// Career ladder for the scope comparison. Ordered: adjacent entries are one
// level apart. The IC and management tracks split after "senior".
export const CAREER_LEVELS = [
  "entry",
  "mid",
  "senior",
  "staff_principal",
  "manager",
  "director",
  "executive",
] as const;

const careerLevel = z.enum(CAREER_LEVELS);

// Short keys reduce completion token overhead by ~40%
export const compactEvaluationSchema = z.object({
  co: z.string().describe("Company name"),
  title: z.string().describe("Official job title"),
  remote: z.boolean().describe("Is fully remote"),
  // Stated before the breakdown so the scope score is grounded in an
  // explicit level comparison. Not stored; only used to steer the model.
  level: z.object({
    candidate: careerLevel.describe(
      "Candidate's current level from the resume, by responsibility and total experience, regardless of field",
    ),
    role: careerLevel.describe(
      "Level the posting hires for, by responsibility and total experience, regardless of field",
    ),
  }),
  breakdown: z.object({
    tech: z.number().min(0).max(100).describe(SCORE_DIMENSIONS.tech.description),
    domain: z
      .number()
      .min(0)
      .max(100)
      .describe(SCORE_DIMENSIONS.domain.description),
    scope: z
      .number()
      .min(0)
      .max(100)
      .describe(SCORE_DIMENSIONS.scope.description),
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
