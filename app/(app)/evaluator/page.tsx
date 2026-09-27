import { requireUser } from "@/lib/supabase/auth";
import { EvaluatorView } from "@/components/evaluator-view";

export default async function EvaluatorPage() {
  const { supabase } = await requireUser();
  const { data: jobSummaries, error } = await supabase
    .from("jobs")
    .select("id, role_title, company_name, match_score, created_at")
    .order("created_at", { ascending: false });

  // Degrade to an empty sidebar rather than failing the whole page
  if (error) console.error("Error fetching jobs:", error);

  return (
    <EvaluatorView
      initialJobSummaries={jobSummaries ?? []}
    />
  );
}
