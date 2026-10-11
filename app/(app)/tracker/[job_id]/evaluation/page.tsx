import JobEvaluationPanel from "@/components/job-evaluation-panel";
import { requireUser } from "@/lib/supabase/auth";
import { jobQuery, unwrapJob } from "@/lib/supabase/load-job";

export default async function JobEvaluationPage(
  props: PageProps<"/tracker/[job_id]/evaluation">,
) {
  const { job_id } = await props.params;
  const { supabase, user } = await requireUser();
  const [
    jobResult,
    { data: evaluations, error: evaluationsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    jobQuery(supabase, user.id, job_id),
    supabase
      .from("evaluations")
      .select("*")
      .eq("job_id", job_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // maybeSingle: a missing profile row just means no resume yet.
    supabase.from("profiles").select("resume").eq("id", user.id).maybeSingle(),
  ]);
  const job = unwrapJob(jobResult);
  if (evaluationsError) throw evaluationsError;
  if (profileError) throw profileError;
  return (
    <>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          {job.role_title}
          <span className="font-semibold text-muted-foreground">
            {" "}
            · {job.company_name}
          </span>
        </h1>
      </div>
      <JobEvaluationPanel
        job={job}
        userId={user.id}
        initialEvaluations={evaluations ?? []}
        hasProfileResume={!!profile?.resume?.trim()}
      />
    </>
  );
}
