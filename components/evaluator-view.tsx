"use client";

import {
  Suspense,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JobSummary } from "@/types/database";
import { EvaluatorViewContent } from "@/components/evaluator-view-content";

export function EvaluatorView({
  initialJobSummaries,
}: {
  initialJobSummaries: JobSummary[];
}) {
  // Lives above the jobId-keyed content so the list survives switching jobs.
  const [jobSummaries, setJobSummaries] =
    useState<JobSummary[]>(initialJobSummaries);

  return (
    <Suspense fallback={<EvaluatorViewFallback />}>
      <EvaluatorViewSearchParams
        jobSummaries={jobSummaries}
        setJobSummaries={setJobSummaries}
      />
    </Suspense>
  );
}

function EvaluatorViewFallback() {
  return (
    <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading...
    </div>
  );
}

function EvaluatorViewSearchParams({
  jobSummaries,
  setJobSummaries,
}: {
  jobSummaries: JobSummary[];
  setJobSummaries: Dispatch<SetStateAction<JobSummary[]>>;
}) {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  const showWelcome = searchParams.get("welcome") === "1";
  // Keying on jobId gives each job a fresh component instance, so state
  // (isLoading, etc.) starts correctly initialized instead of needing an
  // Effect to reset it when the param changes.
  return (
    <EvaluatorViewContent
      key={jobId}
      jobId={jobId}
      showWelcome={showWelcome}
      jobSummaries={jobSummaries}
      setJobSummaries={setJobSummaries}
    />
  );
}
