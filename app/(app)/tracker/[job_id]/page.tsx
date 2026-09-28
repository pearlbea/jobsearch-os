import JobTrackerForm from "@/components/job-tracker-form";
import JobInteractions from "@/components/job-interactions";
import JobEvaluateForm from "@/components/job-evaluate-form";
import BackToTrackerLink from "@/components/back-to-tracker-link";
import Link from "next/link";
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
      <BackToTrackerLink />
      <JobTrackerForm job={job} />
      {/* match_score is the latest evaluation's snapshot, so null = never evaluated. */}
      {job.match_score === null ? (
        <JobEvaluateForm
          jobId={job.id}
          userId={user.id}
          initialDescription={job.raw_description}
        />
      ) : (
        <section className="max-w-3xl mx-auto mt-8 p-6 flex items-center justify-between gap-4 bg-card border border-border rounded-2xl">
          <p className="text-sm text-foreground">
            <span className="font-bold">Match score: {job.match_score}%</span>
          </p>
          <Link
            href={`/evaluator?job=${job.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View full evaluation
          </Link>
        </section>
      )}
      <JobInteractions
        jobId={job.id}
        userId={user.id}
        initialInteractions={interactions ?? []}
      />
    </>
  );
}
