import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { compactEvaluationSchema } from "@/lib/schemas/evaluation";
import { redactPii } from "@/lib/redact-pii";
import { computeMatchScore, SCORE_DIMENSIONS } from "@/lib/score-dimensions";
import type { EvaluationSummary, Profile } from "@/types/database";

// e.g. "breakdown.tech, breakdown.domain, breakdown.scope" — built from the
// same keys the schema and the compact->full mapping below use, so a
// dimension rename can't silently desync the prompt from the schema.
const breakdownFieldList = Object.keys(SCORE_DIMENSIONS)
  .map((key) => `breakdown.${key}`)
  .join(", ");

// Also hard-coded in the evaluations_enforce_limit trigger (supabase/schema.sql),
// which is what actually enforces it; supabase/schema.test.ts keeps them equal.
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

  const systemPrompt = `You are a dual-perspective talent evaluator: a literal keyword matcher AND an Executive Engineering Leader.

  EVALUATION RULES:
  1. KEYWORD MATCH (ats_analysis): Match literally, not by meaning. Identify high-frequency technical tools, certifications, or domain terms explicitly present in the JOB POSTING that are missing verbatim from the RESUME.
  2. SCORE BREAKDOWN: Score ${breakdownFieldList} independently of each other, as defined in their schema descriptions. The "scope" dimension in particular — ${SCORE_DIMENSIONS.scope.description} — should be evaluated as the Executive Engineering Leader persona, not as a proxy for technical skill. There is no separate overall score to invent — the app computes it as a weighted average of these three dimensions, so each one must stand on its own as an accurate 0-100 read.

  CANDIDATE:
  - Resume: ${redactedResume}
  - Key Projects: ${keyProjects}

  RUBRIC (apply to each of ${breakdownFieldList} independently):
  - 90-100: Exact match on that dimension.
  - 75-89: Solid fit; missing minor nice-to-haves.
  - 50-74: Partial fit; notable gaps.
  - <50: Poor alignment.

  TECH ANCHORS (breakdown.tech): First sort the posting's technical requirements into REQUIRED (listed as requirements, must-haves, or "required") and NICE-TO-HAVE. Then score:
  - Every required technology evidenced in the resume or key projects: 75-100, using the rubric above for nice-to-haves.
  - Exactly one required technology with no evidence, everything else matching: 55-65.
  - Two or more required technologies with no evidence: below 50.
  Adjacent experience (a comparable tool in the same category) counts as half: score it one band higher than missing. A missing nice-to-have costs at most 5 points and never moves the score into a lower band. Seniority and management scope do not affect tech.

  SCOPE ANCHORS (breakdown.scope): Compare only level and responsibility: IC vs. management track, seniority, size of team led, and decision-making authority. Ignore whether the technologies or industry match; that is what tech and domain measure. A senior engineer applying for a senior engineering role in an unrelated field is a scope match. Years required in a specific technology or field (e.g. "6+ years of embedded C") are tech/domain requirements; for scope, compare total professional experience and responsibility.
  - Same track and level (e.g. senior IC to senior IC, manager of ~8 to manager of ~8): 80-100.
  - One level apart on the same track (e.g. senior to staff, squad lead to first-line manager): 55-79.
  - Two or more levels apart, or a track change (e.g. IC to manager of managers, director to IC): below 40.

  Evaluate objectively and output structured JSON.
  `;

  const { output } = await generateText({
    model: anthropic("claude-sonnet-5"),
    output: Output.object({ schema: compactEvaluationSchema }),
    system: systemPrompt,
    prompt: `JOB POSTING:\n${cleanedDescription}`,
  });

  const evalResult = { ...output, score: computeMatchScore(output.breakdown) };

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
