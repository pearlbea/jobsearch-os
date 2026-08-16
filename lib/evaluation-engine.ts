import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { compactEvaluationSchema } from "@/lib/schemas/evaluation";
import { redactPii } from "@/lib/redact-pii";
import type { EvaluationSummary, Profile } from "@/types/database";

export const MAX_EVALUATIONS_PER_USER = 5;

// Strip boilerplate equal opportunity / legal footer text from the pasted JD
export function cleanJobDescription(text: string): string {
  return text
    .replace(
      /(equal opportunity employer|eoe|affirmative action|disability\/vet|employment decisions without regard to).*/is,
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

  const systemPrompt = `You are an dual-perspective talent evaluator: an ATS (Applicant Tracking System) parser AND an Executive Engineering Leader.

  EVALUATION RULES:
  1. SEMANTIC MATCH (Overall Score): Evaluate if the candidate's actual experience and capabilities match the role.
  2. ATS KEYWORD SCAN (ats_analysis): Act like a strict, literal keyword filter (Workday/Taleo). Identify high-frequency technical tools, certifications, or domain terms explicitly present in the JOB POSTING that are missing verbatim from the RESUME.
  3. SCORE BREAKDOWN: Score breakdown.tech, breakdown.domain, and breakdown.scope independently of each other, as defined in their schema descriptions. breakdown.scope in particular is a leadership/seniority assessment (team size, decision-making authority, IC vs. management track) — evaluate it as the Executive Engineering Leader persona, not as a proxy for technical skill.

  CANDIDATE:
  - Resume: ${redactedResume}
  - Key Projects: ${stories?.map((s) => `${s.title} (${s.competencies?.join(",")})`).join("; ")}

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

  // Map compact keys back to full database schema before saving
  const fullEvaluationSummary: EvaluationSummary = {
    match_score: evalResult.score,
    score_breakdown: {
      technical_match: evalResult.breakdown.tech,
      domain_match: evalResult.breakdown.domain,
      leadership_match: evalResult.breakdown.scope,
    },
    key_strengths: evalResult.strengths,
    potential_gaps: evalResult.gaps,
    positioning_advice: evalResult.advice,
    ats_analysis: evalResult.ats_analysis,
    parsed_requirements: {
      required_skills: evalResult.skills,
      preferred_skills: [],
      is_remote: evalResult.remote,
    },
  };

  return { evalResult, fullEvaluationSummary };
}
