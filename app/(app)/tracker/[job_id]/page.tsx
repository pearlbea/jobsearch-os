import JobTrackerForm from "@/components/job-tracker-form";
import { requireUser } from "@/lib/supabase/auth";
import { jobQuery, unwrapJob } from "@/lib/supabase/load-job";

export default async function JobPage(props: PageProps<"/tracker/[job_id]">) {
  const { job_id } = await props.params;
  const { supabase, user } = await requireUser();
  const job = unwrapJob(await jobQuery(supabase, user.id, job_id));
  return <JobTrackerForm job={job} />;
}
