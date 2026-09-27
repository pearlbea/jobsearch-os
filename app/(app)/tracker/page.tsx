import { requireUser } from "@/lib/supabase/auth";
import { Job } from "@/types/database";

export default async function TrackerPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-[28px] font-extrabold tracking-tight text-foreground mb-1.5">
        Job Tracker
      </h1>

      {profile?.jobs?.map((job: Job) => (
        <div key={job.id}>
          <h2>{job.role_title}</h2>
          <p>{job.company_name}</p>
          <p>{job.match_score}%</p>
          <p>{new Date(job.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
