import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { Job } from "@/types/database";
import JobTrackerRow from "@/components/job-tracker-row";
import { Button } from "@/components/ui/button";

export default async function TrackerPage() {
  const { supabase, user } = await requireUser();
  const { data: jobSummaries, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
          Job Tracker
        </h1>
        <Button render={<Link href="/tracker/new" />} nativeButton={false}>
          Add New Job
        </Button>
      </div>
      {error && <p>Error loading job summaries: {error.message}</p>}
      {jobSummaries?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No jobs yet. Add one to start tracking and evaluating it.
        </p>
      )}
      <ul>
        {jobSummaries?.map((job: Job) => (
          <JobTrackerRow key={job.id} job={job} />
        ))}
      </ul>
    </div>
  );
}
