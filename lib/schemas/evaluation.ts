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

// Soft caps on the list fields: stated to the model in the descriptions and
// enforced by truncation in runEvaluation, not by .max(), so an overlong
// list trims instead of failing the whole evaluation.
export const MAX_MISSING_KEYWORDS = 8;
export const MAX_FORMATTING_WARNINGS = 3;
export const MAX_STRENGTHS = 3;
export const MAX_GAPS = 2;
export const MAX_TALKING_POINTS = 3;
export const MAX_SKILLS = 6;

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
        `Up to ${MAX_MISSING_KEYWORDS} high-importance exact keywords/phrases in the JD that are completely missing from the resume, most important first`,
      ),
    formatting_warnings: z
      .array(z.string())
      .describe(
        `Up to ${MAX_FORMATTING_WARNINGS} structural or clarity issues in the resume text (e.g. non-standard job titles, missing dates)`,
      ),
  }),
  strengths: z
    .array(z.string())
    .describe(`Top 2-${MAX_STRENGTHS} key match points (concise)`),
  gaps: z
    .array(z.string())
    .describe(`Top 1-${MAX_GAPS} missing skills/qualifications`),
  advice: z.string().describe("1-sentence positioning strategy"),
  // Last of the scored/analytic fields so the scores are generated before any
  // talking-point text exists.
  points: z
    .array(
      z.object({
        say: z.string().describe("1-2 sentences, first person, speakable"),
        basis: z.string().describe("Resume role or project this rests on"),
      }),
    )
    .describe(
      `2-${MAX_TALKING_POINTS} talking points the candidate can say; resume-supported only; empty if none`,
    ),
  skills: z
    .array(z.string())
    .describe(`Top ${MAX_SKILLS} extracted tech requirements`),
});

export type CompactEvaluation = z.infer<typeof compactEvaluationSchema>;
