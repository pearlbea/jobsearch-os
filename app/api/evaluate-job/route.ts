import { type NextRequest, NextResponse } from "next/server";
import { NoOutputGeneratedError } from "ai";
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

    // 8. Re-check the cap now that the row is actually committed. The check in
    // step 2 is only a fast-path to avoid spending tokens in the common case —
    // it can't prevent two concurrent requests from both passing it before
    // either has inserted. This recheck is the real enforcement: whichever
    // request's insert is the one that pushes the count over the limit rolls
    // its own rows back, so the cap holds even when requests race.
    const { count: finalCount, error: finalCountError } = await supabase
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (finalCountError) throw finalCountError;

    if ((finalCount ?? 0) > MAX_EVALUATIONS_PER_USER) {
      const { error: rollbackEvalError } = await supabase
        .from("evaluations")
        .delete()
        .eq("id", savedEvaluation.id);
      if (rollbackEvalError) {
        console.error("Failed to roll back evaluation over cap:", rollbackEvalError);
      }
      const { error: rollbackJobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", savedJob.id);
      if (rollbackJobError) {
        console.error("Failed to roll back job over cap:", rollbackJobError);
      }

      return NextResponse.json(
        {
          error: `You've reached the limit of ${MAX_EVALUATIONS_PER_USER} evaluations for this demo.`,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      job: savedJob,
      evaluation: savedEvaluation,
    });
  } catch (error) {
    console.error("Optimized Evaluation Error:", error);
    if (NoOutputGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "The AI evaluator returned an unexpected response. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
