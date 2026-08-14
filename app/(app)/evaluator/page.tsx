import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvaluatorView } from "@/components/evaluator-view";

export default async function EvaluatorPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  return <EvaluatorView />;
}
