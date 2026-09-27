"use client";

import {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Job, JobSummary, Evaluation } from "@/types/database";
import { cn } from "@/lib/utils";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationsList } from "@/components/evaluations-list";
import { EvaluationHistory } from "@/components/evaluation-history";

export function EvaluatorViewContent({
  jobId,
  showWelcome,
  jobSummaries,
  setJobSummaries,
}: {
  jobId: string | null;
  showWelcome: boolean;
  jobSummaries: JobSummary[];
  setJobSummaries: Dispatch<SetStateAction<JobSummary[]>>;
}) {
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

  useEffect(() => {
    if (!showWelcome) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("welcome");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `/evaluator${query ? `?${query}` : ""}`,
    );
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

  // Shallow navigation: the native History API updates useSearchParams
  // without a server round trip, so the page's jobs query doesn't re-run.
  const showJob = (targetJobId: string) => {
    window.history.pushState(
      null,
      "",
      `/evaluator?job=${encodeURIComponent(targetJobId)}`,
    );
  };

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
    showJob(newJob.id);
  };

  const handleSelectJob = (selectedJobId: string) => {
    showJob(selectedJobId);
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

      {showWelcome && (
        <div className="p-4 rounded-md text-sm font-medium bg-green-50 text-green-800">
          You&apos;re all set! Paste in a job description below to get your
          first evaluation.
        </div>
      )}

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
          <div className="p-12 bg-card border border-border rounded-2xl text-center text-sm text-muted-foreground min-w-0">
            Loading evaluation report...
          </div>
        ) : activeJob && selectedEvaluation ? (
          <div className="flex flex-col gap-6 min-w-0">
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
          <div className="p-12 bg-card border border-border rounded-2xl text-center text-sm text-muted-foreground min-w-0">
            {notFound
              ? "That evaluation couldn't be found."
              : "Submit a job posting above to see your evaluation, or click on a saved evaluation to view the details."}
          </div>
        )}
      </div>
    </div>
  );
}
