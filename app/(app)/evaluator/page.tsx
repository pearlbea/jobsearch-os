import { redirect } from "next/navigation";

export default async function EvaluatorPage(props: PageProps<"/evaluator">) {
  const { job } = await props.searchParams;
  redirect(typeof job === "string" && job ? `/tracker/${encodeURIComponent(job)}/evaluation` : "/tracker");
}
