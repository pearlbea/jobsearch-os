import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { compactEvaluationSchema } from "@/lib/schemas/evaluation";

// Helper: Strip boilerplate equal opportunity / legal footers from job descriptions
function cleanJobDescription(text: string): string {
  return text
    .replace(
      /(equal opportunity employer|eoe|affirmative action|disability\/vet|employment decisions without regard to).*/is,
      "",
    )
    .replace(/\n\s*\n/g, "\n") // Remove excessive blank lines
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { raw_description, job_url } = await req.json();
    if (!raw_description) {
      return NextResponse.json(
        { error: "raw_description is required" },
        { status: 400 },
      );
    }

    // 1. Fetch compact profile fields only
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, target_titles, location_preference, resume, technical_skills",
      )
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Fetch story metadata only (omit full story_text to save input tokens)
    const { data: stories } = await supabase
      .from("stories")
      .select("title, company, competencies")
      .eq("user_id", user.id);

    // 3. Pre-process job description to drop non-essential footer text
    const cleanedDescription = cleanJobDescription(raw_description);

    // 4. Prompt framing
    const systemPrompt = `You are an dual-perspective talent evaluator: an ATS (Applicant Tracking System) parser AND an Executive Engineering Leader.

  EVALUATION RULES:
  1. SEMANTIC MATCH (Overall Score): Evaluate if the candidate's actual experience and capabilities match the role.
  2. ATS KEYWORD SCAN (ats_analysis): Act like a strict, literal keyword filter (Workday/Taleo). Identify high-frequency technical tools, certifications, or domain terms explicitly present in the JOB POSTING that are missing verbatim from the RESUME.

  CANDIDATE:
  - Target: ${profile.target_titles?.join(", ")} | Location: ${profile.location_preference}
  - Skills: ${profile.technical_skills?.join(", ")}
  - Summary: ${profile.resume?.slice(0, 300)}
  - Key Projects: ${stories?.map((s) => `${s.title} (${s.competencies?.join(",")})`).join("; ")}

  RUBRIC:
  - 90-100: Exact match on skills, scope, and domain.
  - 75-89: Solid fit; missing minor nice-to-haves.
  - 50-74: Partial fit; notable gaps in domain or core tech.
  - <50: Poor alignment.
  
  Evaluate objectively and output structured JSON.
  `;

    // 5. LLM Call
    const { output: evalResult } = await generateText({
      model: anthropic("claude-sonnet-5"),
      output: Output.object({ schema: compactEvaluationSchema }),
      system: systemPrompt,
      prompt: `JOB POSTING:\n${cleanedDescription}`,
    });

    // 6. Map compact keys back to full database schema before saving
    const fullEvaluationSummary = {
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

    // Save to Supabase
    const { data: savedJob, error: insertError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        company_name: evalResult.co,
        role_title: evalResult.title,
        location: evalResult.remote ? "Remote" : profile.location_preference,
        job_url: job_url || null,
        raw_description,
        status: "bookmarked",
        match_score: evalResult.score,
        evaluation_summary: fullEvaluationSummary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, job: savedJob });
  } catch (error) {
    console.error("Optimized Evaluation Error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
