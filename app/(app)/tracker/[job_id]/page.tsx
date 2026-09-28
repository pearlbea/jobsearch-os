import JobTrackerForm from "@/components/job-tracker-form";
import JobInteractions from "@/components/job-interactions";
import { requireUser } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";

const NOT_FOUND_CODES = new Set(["PGRST116", "22P02"]);

export default async function JobPage(props: PageProps<"/tracker/[job_id]">) {
  const { job_id } = await props.params;
  const { supabase, user } = await requireUser();
  const [
    { data: job, error: jobError },
    { data: interactions, error: interactionsError },
  ] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("interactions")
        .select("*")
        .eq("job_id", job_id)
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false, nullsFirst: true }),
    ]);
  // Only a missing row is a 404: PGRST116 is .single() matching no rows
  // (including another user's job), 22P02 is a job_id that isn't a UUID.
  // Anything else is a real failure and goes to the error page.
  if (jobError && !NOT_FOUND_CODES.has(jobError.code)) throw jobError;
  if (!job) {
    notFound();
  }
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
