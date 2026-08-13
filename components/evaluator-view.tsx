"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Loader2 } from "lucide-react";
import { Job } from "@/types/database";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";
import { HistoryModal } from "@/components/history-modal";

export function EvaluatorView() {
  return (
    <Suspense fallback={<EvaluatorViewFallback />}>
      <EvaluatorViewSearchParams />
    </Suspense>
  );
}

function EvaluatorViewFallback() {
  return (
    <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 p-12 text-sm text-zinc-400">
      <Loader2 className="size-4 animate-spin" />
      Loading...
    </div>
  );
}

function EvaluatorViewSearchParams() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  // Keying on jobId gives each job a fresh component instance, so state
  // (isLoading, isFormOpen, etc.) starts correctly initialized instead of
  // needing an Effect to reset it when the param changes.
  return <EvaluatorViewContent key={jobId} jobId={jobId} />;
}

function EvaluatorViewContent({ jobId }: { jobId: string | null }) {
  const router = useRouter();

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(!!jobId);
  const [notFound, setNotFound] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(!jobId);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function loadActiveJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load job");
        const job = data.job as Job;

        if (!cancelled) {
          setActiveJob(job);
          // A result is showing — collapse the form so it's not the first
          // thing you see; it's still one click away via "New evaluation".
          setIsFormOpen(false);
        }
      } catch (err) {
        console.error("Error loading evaluation:", err);
        if (!cancelled) {
          setNotFound(true);
          // Nothing to show — keep the form open so there's something to do.
          setIsFormOpen(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadActiveJob();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleEvaluationComplete = (newJob: Job) => {
    setActiveJob(newJob);
    setNotFound(false);
    setIsFormOpen(false);
  };

  const handleSelectJob = (selectedJobId: string) => {
    setIsHistoryOpen(false);
    router.push(`/evaluator?job=${selectedJobId}`);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
            Job Evaluator
          </h1>
          <p className="text-[13.5px] text-zinc-500 mt-1">
            Evaluate job postings against your resume, competencies, and ATS
            filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 h-9 border border-zinc-200 rounded-[7px] text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
        >
          <Clock className="size-4" />
          History
        </button>
      </div>

      <HistoryModal
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onSelectJob={handleSelectJob}
      />

      <JobEvaluatorForm
        onEvaluationComplete={handleEvaluationComplete}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {isLoading ? (
        <div className="p-12 border border-zinc-200 rounded-[10px] text-center text-sm text-zinc-500">
          Loading evaluation report...
        </div>
      ) : activeJob ? (
        <EvaluationCard job={activeJob} />
      ) : (
        <div className="p-12 border border-zinc-200 rounded-[10px] text-center text-sm text-zinc-400">
          {notFound
            ? "That evaluation couldn't be found."
            : "Submit a job posting above to see your first evaluation."}
        </div>
      )}
    </div>
  );
}
