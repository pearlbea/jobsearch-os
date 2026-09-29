import { redirect } from "next/navigation";

// Evaluation now happens on each job's tracker page. This keeps old
// /evaluator and /evaluator?job=<id> links working.
export default async function EvaluatorPage(props: PageProps<"/evaluator">) {
  const { job } = await props.searchParams;
  redirect(typeof job === "string" && job ? `/tracker/${encodeURIComponent(job)}` : "/tracker");
}
