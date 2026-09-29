import BackToTrackerLink from "@/components/back-to-tracker-link";
import NewJobForm from "@/components/new-job-form";
import { requireUser } from "@/lib/supabase/auth";

export default async function NewJobPage() {
  const { user } = await requireUser();
  return (
    <>
      <BackToTrackerLink />
      <NewJobForm userId={user.id} />
    </>
  );
}
