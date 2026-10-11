import JobTrackerForm from "@/components/job-tracker-form";
import JobInteractions from "@/components/job-interactions";
import { requireUser } from "@/lib/supabase/auth";
import { jobQuery, unwrapJob } from "@/lib/supabase/load-job";

export default async function JobPage(props: PageProps<"/tracker/[job_id]">) {
  const { job_id } = await props.params;
  const { supabase, user } = await requireUser();
  const [jobResult, { data: interactions, error: interactionsError }] =
    await Promise.all([
      jobQuery(supabase, user.id, job_id),
      supabase
        .from("interactions")
        .select("*")
        .eq("job_id", job_id)
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false, nullsFirst: true }),
    ]);
  const job = unwrapJob(jobResult);
  if (interactionsError) throw interactionsError;
  return (
    <>
      <JobTrackerForm job={job} />
      <JobInteractions
        jobId={job.id}
        userId={user.id}
        initialInteractions={interactions ?? []}
      />
    </>
  );
}
