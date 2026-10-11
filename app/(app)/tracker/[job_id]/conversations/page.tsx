import JobInteractions from "@/components/job-interactions";
import { requireUser } from "@/lib/supabase/auth";
import { jobQuery, unwrapJob } from "@/lib/supabase/load-job";

export default async function JobConversationsPage(
  props: PageProps<"/tracker/[job_id]/conversations">,
) {
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          {job.role_title}
          <span className="font-semibold text-muted-foreground">
            {" "}
            · {job.company_name}
          </span>
        </h1>
      </div>
      <JobInteractions
        jobId={job.id}
        userId={user.id}
        jobStatus={job.status}
        initialInteractions={interactions ?? []}
      />
    </>
  );
}
