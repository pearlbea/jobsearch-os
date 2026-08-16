import { type NextRequest, NextResponse } from "next/server";
import { NoOutputGeneratedError } from "ai";
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

    // 7. Re-check the cap now that the row is actually committed. Step 3 is
    // only a fast-path to avoid spending tokens in the common case — it can't
    // prevent two concurrent requests from both passing it before either has
    // inserted. This recheck is the real enforcement, and it has to be a
    // per-row decision, not a shared count comparison: if two requests both
    // read the same over-cap total, comparing that total against the cap
    // would make BOTH of them roll back, underfilling the cap. Instead, rank
    // this row against the user's other evaluations by insertion order — only
    // the rows that actually fall beyond the cap roll themselves back (and
    // skip the job update below), so the final count settles at exactly the
    // cap regardless of how requests race.
    const { data: userEvaluations, error: rankError } = await supabase
      .from("evaluations")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (rankError) throw rankError;

    const rank =
      (userEvaluations ?? []).findIndex((e) => e.id === savedEvaluation.id) +
      1;

    if (rank > MAX_EVALUATIONS_PER_USER) {
      const { error: rollbackEvalError } = await supabase
        .from("evaluations")
        .delete()
        .eq("id", savedEvaluation.id);
      if (rollbackEvalError) {
        console.error("Failed to roll back evaluation over cap:", rollbackEvalError);
      }

      return NextResponse.json(
        {
          error: `You've reached the limit of ${MAX_EVALUATIONS_PER_USER} evaluations for this demo.`,
        },
        { status: 403 },
      );
    }

    // 8. Refresh the job's denormalized snapshot from the evaluations table's
    // own latest row (by created_at) rather than this request's own result.
    // Two re-evaluations of the same job can race, and their `jobs` updates
    // can land in either order — reading "latest" back out here means
    // whichever update runs last still writes a snapshot consistent with the
    // newest evaluation row, instead of last-write-wins on stale data.
    const { data: latestEvaluation, error: latestEvalError } = await supabase
      .from("evaluations")
      .select("match_score, evaluation_summary")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestEvalError) throw latestEvalError;

    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update({
        match_score: latestEvaluation.match_score,
        evaluation_summary: latestEvaluation.evaluation_summary,
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
    if (NoOutputGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "The AI evaluator returned an unexpected response. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
