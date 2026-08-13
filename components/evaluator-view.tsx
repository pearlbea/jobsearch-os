"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Job } from "@/types/database";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";

export function EvaluatorView() {
  return (
    <Suspense>
      <EvaluatorViewContent />
    </Suspense>
  );
}

function EvaluatorViewContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!jobId) {
      // No job requested — don't surface the most recent evaluation, just
      // show the form.
      setActiveJob(null);
      setNotFound(false);
      setIsLoading(false);
      setIsFormOpen(true);
      return;
    }

    async function loadActiveJob() {
      setIsLoading(true);
      setNotFound(false);

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
          setActiveJob(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const handleEvaluationComplete = (newJob: Job) => {
    setActiveJob(newJob);
    setNotFound(false);
    setIsFormOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
          Job Evaluator
        </h1>
        <p className="text-[13.5px] text-zinc-500 mt-1">
          Evaluate job postings against your resume, competencies, and ATS
          filters.
        </p>
      </div>

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
