import { requireUser } from "@/lib/supabase/auth";
import { Job } from "@/types/database";
import JobTrackerRow from "@/components/job-tracker-row";

export default async function TrackerPage() {
  const { supabase, user } = await requireUser();
  const { data: jobSummaries, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-[28px] font-extrabold tracking-tight text-foreground mb-1.5">
        Job Tracker
      </h1>
      {error && <p>Error loading job summaries: {error.message}</p>}
      {jobSummaries?.map((job: Job) => (
        <JobTrackerRow key={job.id} job={job} />
      ))}
    </div>
  );
}
