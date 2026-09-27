import JobTrackerForm from "@/components/job-tracker-form";
import JobInteractions from "@/components/job-interactions";
import { requireUser } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";

export default async function JobPage(props: PageProps<"/tracker/[job_id]">) {
  const { job_id } = await props.params;
  const { supabase, user } = await requireUser();
  const [{ data: job }, { data: interactions, error: interactionsError }] =
    await Promise.all([
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
