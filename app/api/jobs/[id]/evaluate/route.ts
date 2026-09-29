import { type NextRequest, NextResponse } from "next/server";
import { NoOutputGeneratedError } from "ai";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_EVALUATIONS_PER_USER,
  cleanJobDescription,
  runEvaluation,
} from "@/lib/evaluation-engine";

// Raised by the evaluations_enforce_limit trigger.
const EVALUATION_LIMIT_SQLSTATE = "EVLIM";

function limitReachedResponse() {
  return NextResponse.json(
    {
      error: `You've reached the limit of ${MAX_EVALUATIONS_PER_USER} evaluations for this demo.`,
    },
    { status: 403 },
  );
}

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

    // Jobs created on the tracker may not have posting text yet.
    if (!job.raw_description?.trim()) {
      return NextResponse.json(
        { error: "Add a job description before evaluating this job." },
        { status: 400 },
      );
    }

    // 2. Fetch compact profile fields only. The row only exists once the user
    // has saved a profile, so a missing one just means no profile resume.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, resume")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    // A resume tailored to this job wins over the profile's default one.
    const resumeUsed = job.tailored_resume?.trim()
      ? job.tailored_resume
      : profile?.resume;

    if (!resumeUsed?.trim()) {
      return NextResponse.json(
        {
          error:
            "Add a resume, either to your profile or tailored to this job, before evaluating.",
        },
        { status: 400 },
      );
    }

    // 3. Check the per-user evaluation cap before spending any tokens. This is
    // only a fast path: two concurrent requests can both pass it. The real
    // enforcement is the evaluations_enforce_limit trigger (see
    // supabase/schema.sql), which refuses the insert in step 6.
    const { count: evaluationCount, error: countError } = await supabase
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;

    if ((evaluationCount ?? 0) >= MAX_EVALUATIONS_PER_USER) {
      return limitReachedResponse();
    }

    // 4. Fetch story metadata only (omit full story_text to save input tokens)
    const { data: stories } = await supabase
      .from("stories")
      .select("title, company, competencies")
      .eq("user_id", user.id);

    // 5. Re-run against the job's stored posting text and the current profile
    const cleanedDescription = cleanJobDescription(job.raw_description);

    if (!cleanedDescription.trim()) {
      return NextResponse.json(
        {
          error:
            "This job's posting text is empty after removing boilerplate and can't be re-evaluated.",
        },
        { status: 400 },
      );
    }

    const { evalResult, fullEvaluationSummary } = await runEvaluation({
      profile: { full_name: profile?.full_name ?? null, resume: resumeUsed },
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
        resume_snapshot: resumeUsed,
      })
      .select()
      .single();

    // The limit trigger's error: another request got the last slot while
    // this one was evaluating.
    if (evalInsertError?.code === EVALUATION_LIMIT_SQLSTATE) {
      return limitReachedResponse();
    }
    if (evalInsertError) throw evalInsertError;

    // 7. Refresh the job's denormalized snapshot from the evaluations table's
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
