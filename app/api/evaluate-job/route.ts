import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_EVALUATIONS_PER_USER,
  cleanJobDescription,
  runEvaluation,
} from "@/lib/evaluation-engine";

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
      .select("full_name, resume")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Enforce the per-user evaluation cap before spending any tokens
    const { count: evaluationCount, error: countError } = await supabase
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;

    if ((evaluationCount ?? 0) >= MAX_EVALUATIONS_PER_USER) {
      return NextResponse.json(
        {
          error: `You've reached the limit of ${MAX_EVALUATIONS_PER_USER} evaluations for this demo.`,
        },
        { status: 403 },
      );
    }

    // 3. Fetch story metadata only (omit full story_text to save input tokens)
    const { data: stories } = await supabase
      .from("stories")
      .select("title, company, competencies")
      .eq("user_id", user.id);

    // 4. Pre-process job description to drop non-essential footer text
    const cleanedDescription = cleanJobDescription(raw_description);

    // 5. Run the evaluation
    const { evalResult, fullEvaluationSummary } = await runEvaluation({
      profile,
      stories,
      cleanedDescription,
    });

    // 6. Save the job (with the latest-evaluation snapshot denormalized on)
    const { data: savedJob, error: insertError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        company_name: evalResult.co,
        role_title: evalResult.title,
        location: evalResult.remote ? "Remote" : null,
        job_url: job_url || null,
        raw_description,
        status: "bookmarked",
        match_score: evalResult.score,
        evaluation_summary: fullEvaluationSummary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 7. Save the first evaluation row for this job's history
    const { data: savedEvaluation, error: evalInsertError } = await supabase
      .from("evaluations")
      .insert({
        job_id: savedJob.id,
        user_id: user.id,
        match_score: evalResult.score,
        evaluation_summary: fullEvaluationSummary,
        resume_snapshot: profile.resume ?? null,
      })
      .select()
      .single();

    if (evalInsertError) throw evalInsertError;

    return NextResponse.json({
      success: true,
      job: savedJob,
      evaluation: savedEvaluation,
    });
  } catch (error) {
    console.error("Optimized Evaluation Error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
