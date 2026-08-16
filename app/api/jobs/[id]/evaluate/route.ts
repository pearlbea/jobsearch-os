import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_EVALUATIONS_PER_USER,
  cleanJobDescription,
  runEvaluation,
} from "@/lib/evaluation-engine";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch the job scoped to this user (also gives us raw_description)
    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 2. Fetch compact profile fields only
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, resume")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 3. Enforce the per-user evaluation cap before spending any tokens
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

    // 4. Fetch story metadata only (omit full story_text to save input tokens)
    const { data: stories } = await supabase
      .from("stories")
      .select("title, company, competencies")
      .eq("user_id", user.id);

    // 5. Re-run against the job's stored posting text and the current profile
    const cleanedDescription = cleanJobDescription(job.raw_description);

    const { evalResult, fullEvaluationSummary } = await runEvaluation({
      profile,
      stories,
      cleanedDescription,
    });

    // 6. Save the new evaluation row
    const { data: savedEvaluation, error: evalInsertError } = await supabase
      .from("evaluations")
      .insert({
        job_id: job.id,
        user_id: user.id,
        match_score: evalResult.score,
        evaluation_summary: fullEvaluationSummary,
        resume_snapshot: profile.resume ?? null,
      })
      .select()
      .single();

    if (evalInsertError) throw evalInsertError;

    // 7. Refresh the job's latest-evaluation snapshot
    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update({
        match_score: evalResult.score,
        evaluation_summary: fullEvaluationSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      job: updatedJob,
      evaluation: savedEvaluation,
    });
  } catch (error) {
    console.error("Re-evaluation Error:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
