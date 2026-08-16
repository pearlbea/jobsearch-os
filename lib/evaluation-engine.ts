import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { compactEvaluationSchema } from "@/lib/schemas/evaluation";
import { redactPii } from "@/lib/redact-pii";
import { SCORE_DIMENSIONS } from "@/lib/score-dimensions";
import type { EvaluationSummary, Profile } from "@/types/database";

// e.g. "breakdown.tech, breakdown.domain, breakdown.scope" — built from the
// same keys the schema and the compact->full mapping below use, so a
// dimension rename can't silently desync the prompt from the schema.
const breakdownFieldList = Object.keys(SCORE_DIMENSIONS)
  .map((key) => `breakdown.${key}`)
  .join(", ");

export const MAX_EVALUATIONS_PER_USER = 5;

// Strip boilerplate equal opportunity / legal footer text from the pasted JD.
// Stops at the next paragraph break so boilerplate appearing before the actual
// role description doesn't take the rest of the posting down with it.
export function cleanJobDescription(text: string): string {
  return text
    .replace(
      /(equal opportunity employer|eoe|affirmative action|disability\/vet|employment decisions without regard to).*?(?=\n\s*\n|$)/is,
      "",
    )
    .replace(/\n\s*\n/g, "\n") // Remove excessive blank lines
    .trim();
}

type EvaluationProfile = Pick<Profile, "full_name" | "resume">;

interface EvaluationStory {
  title: string;
  company: string | null;
  competencies: string[] | null;
}

export async function runEvaluation({
  profile,
  stories,
  cleanedDescription,
}: {
  profile: EvaluationProfile;
  stories: EvaluationStory[] | null;
  cleanedDescription: string;
}) {
  // Strip name/email/phone/website from the resume before it reaches the model
  const redactedResume = profile.resume
    ? redactPii(profile.resume, profile.full_name)
    : profile.resume;

  const keyProjects = stories?.length
    ? stories
        .map((s) =>
          s.competencies?.length
            ? `${s.title} (${s.competencies.join(", ")})`
            : s.title,
        )
        .join("; ")
    : "None provided";

  const systemPrompt = `You are an dual-perspective talent evaluator: an ATS (Applicant Tracking System) parser AND an Executive Engineering Leader.

  EVALUATION RULES:
  1. SEMANTIC MATCH (Overall Score): Evaluate if the candidate's actual experience and capabilities match the role.
  2. ATS KEYWORD SCAN (ats_analysis): Act like a strict, literal keyword filter (Workday/Taleo). Identify high-frequency technical tools, certifications, or domain terms explicitly present in the JOB POSTING that are missing verbatim from the RESUME.
  3. SCORE BREAKDOWN: Score ${breakdownFieldList} independently of each other, as defined in their schema descriptions. The "scope" dimension in particular — ${SCORE_DIMENSIONS.scope.description} — should be evaluated as the Executive Engineering Leader persona, not as a proxy for technical skill.

  CANDIDATE:
  - Resume: ${redactedResume}
  - Key Projects: ${keyProjects}

  RUBRIC:
  - 90-100: Exact match on skills, scope, and domain.
  - 75-89: Solid fit; missing minor nice-to-haves.
  - 50-74: Partial fit; notable gaps in domain or core tech.
  - <50: Poor alignment.

  Evaluate objectively and output structured JSON.
  `;

  const { output: evalResult } = await generateText({
    model: anthropic("claude-sonnet-5"),
    output: Output.object({ schema: compactEvaluationSchema }),
    system: systemPrompt,
    prompt: `JOB POSTING:\n${cleanedDescription}`,
  });

  // Map compact keys back to full database schema before saving. The field
  // names on both sides come from SCORE_DIMENSIONS (lib/score-dimensions.ts)
  // rather than being retyped here, so tech/domain/scope <-> their DB column
  // names stay reconciled in one place.
  const fullEvaluationSummary: EvaluationSummary = {
    match_score: evalResult.score,
    score_breakdown: {
      [SCORE_DIMENSIONS.tech.fullKey]: evalResult.breakdown.tech,
      [SCORE_DIMENSIONS.domain.fullKey]: evalResult.breakdown.domain,
      [SCORE_DIMENSIONS.scope.fullKey]: evalResult.breakdown.scope,
    },
    key_strengths: evalResult.strengths,
    potential_gaps: evalResult.gaps,
    positioning_advice: evalResult.advice,
    ats_analysis: evalResult.ats_analysis,
  };

  return { evalResult, fullEvaluationSummary };
}
