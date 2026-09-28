import { requireUser } from "@/lib/supabase/auth";
import { EvaluatorView } from "@/components/evaluator-view";

export default async function EvaluatorPage() {
  const { supabase, user } = await requireUser();
  // Jobs added on the tracker have no evaluation until one is run, so they
  // don't belong in the evaluation history.
  const { data: jobSummaries, error } = await supabase
    .from("jobs")
    .select("id, role_title, company_name, match_score, created_at")
    .eq("user_id", user.id)
    .not("match_score", "is", null)
    .order("created_at", { ascending: false });

  // Degrade to an empty sidebar rather than failing the whole page
  if (error) console.error("Error fetching jobs:", error);

  return (
    <EvaluatorView
      initialJobSummaries={jobSummaries ?? []}
    />
  );
}
