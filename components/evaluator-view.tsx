"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Job, JobSummary, Evaluation } from "@/types/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationsList } from "@/components/evaluations-list";
import { EvaluationHistory } from "@/components/evaluation-history";

export function EvaluatorView() {
  return (
    <Suspense fallback={<EvaluatorViewFallback />}>
      <EvaluatorViewSearchParams />
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

function EvaluatorViewSearchParams() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  // Keying on jobId gives each job a fresh component instance, so state
  // (isLoading, etc.) starts correctly initialized instead of needing an
  // Effect to reset it when the param changes.
  return <EvaluatorViewContent key={jobId} jobId={jobId} />;
}

function EvaluatorViewContent({ jobId }: { jobId: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [evaluationHistory, setEvaluationHistory] = useState<Evaluation[]>([]);
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(!!jobId);
  const [reevaluatingJobId, setReevaluatingJobId] = useState<string | null>(
    null,
  );
  const [notFound, setNotFound] = useState(false);
  const [jobSummaries, setJobSummaries] = useState<JobSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummaries() {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, role_title, company_name, match_score, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setJobSummaries((data as JobSummary[]) || []);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    }

    fetchSummaries();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const requestedJobId = jobId;

    async function loadActiveJob() {
      try {
        const res = await fetch(
          `/api/jobs/${encodeURIComponent(requestedJobId)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load job");
        const job = data.job as Job;
        const evaluations = data.evaluations as Evaluation[];

        if (!cancelled) {
          setActiveJob(job);
          setEvaluationHistory(evaluations);
          setActiveEvaluationId(evaluations[0]?.id ?? null);
        }
      } catch (err) {
        console.error("Error loading evaluation:", err);
        if (!cancelled) {
          setNotFound(true);
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

  const handleEvaluationComplete = (newJob: Job, newEvaluation: Evaluation) => {
    setActiveJob(newJob);
    setEvaluationHistory([newEvaluation]);
    setActiveEvaluationId(newEvaluation.id);
    setNotFound(false);
    setJobSummaries((prev) => [
      {
        id: newJob.id,
        role_title: newJob.role_title,
        company_name: newJob.company_name,
        match_score: newJob.match_score,
        created_at: newJob.created_at,
      },
      ...prev.filter((j) => j.id !== newJob.id),
    ]);
    router.push(`/evaluator?job=${encodeURIComponent(newJob.id)}`);
  };

  const handleSelectJob = (selectedJobId: string) => {
    router.push(`/evaluator?job=${encodeURIComponent(selectedJobId)}`);
  };

  const handleReevaluate = async (targetJobId: string) => {
    setReevaluatingJobId(targetJobId);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(targetJobId)}/evaluate`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to re-evaluate job.");

      const updatedJob = data.job as Job;
      const newEvaluation = data.evaluation as Evaluation;

      setJobSummaries((prev) =>
        prev.map((j) =>
          j.id === updatedJob.id
            ? { ...j, match_score: updatedJob.match_score }
            : j,
        ),
      );

      // Only refresh the open card/history if this is the job currently on screen
      if (activeJob?.id === updatedJob.id) {
        setActiveJob(updatedJob);
        setEvaluationHistory((prev) => [newEvaluation, ...prev]);
        setActiveEvaluationId(newEvaluation.id);
      }
    } catch (err) {
      console.error("Error re-evaluating job:", err);
    } finally {
      setReevaluatingJobId(null);
    }
  };

  const selectedEvaluation =
    evaluationHistory.find((e) => e.id === activeEvaluationId) ??
    evaluationHistory[0] ??
    null;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground mb-1.5">
          Job Evaluator
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Evaluate job postings against your resume.
        </p>
      </div>

      <JobEvaluatorForm onEvaluationComplete={handleEvaluationComplete} />

      <div
        className={cn(
          "grid grid-cols-1 gap-6 items-start",
          jobSummaries.length > 0 && "md:grid-cols-[300px_1fr]",
        )}
      >
        {jobSummaries.length > 0 && (
          <EvaluationsList
            jobs={jobSummaries}
            selectedJobId={jobId}
            onSelectJob={handleSelectJob}
            onReevaluateJob={handleReevaluate}
            reevaluatingJobId={reevaluatingJobId}
          />
        )}

        {isLoading ? (
          <div className="p-12 bg-card border border-border rounded-2xl text-center text-sm text-muted-foreground">
            Loading evaluation report...
          </div>
        ) : activeJob && selectedEvaluation ? (
          <div className="flex flex-col gap-6">
            {evaluationHistory.length > 1 && (
              <EvaluationHistory
                evaluations={evaluationHistory}
                selectedEvaluationId={selectedEvaluation.id}
                onSelectEvaluation={setActiveEvaluationId}
              />
            )}
            <EvaluationCard
              job={activeJob}
              evaluation={selectedEvaluation}
              onReevaluate={() => handleReevaluate(activeJob.id)}
              isReevaluating={reevaluatingJobId === activeJob.id}
            />
          </div>
        ) : (
          <div className="p-12 bg-card border border-border rounded-2xl text-center text-sm text-muted-foreground">
            {notFound
              ? "That evaluation couldn't be found."
              : "Submit a job posting above to see your evaluation."}
          </div>
        )}
      </div>
    </div>
  );
}
