"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Evaluation, Job } from "@/types/database";
import { Button } from "@/components/ui/button";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationHistory } from "@/components/evaluation-history";

type ResumeSource = "profile" | "tailored";

const textareaClass =
  "w-full px-3.5 py-3 border border-input rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary";

// Evaluates the job's saved description
// against either the profile resume or a resume tailored to this job (saved
// on the job, so re-evaluations reuse it), and shows the results + history.
export default function JobEvaluationPanel({
  job,
  userId,
  initialEvaluations,
  hasProfileResume: initialHasProfileResume,
}: {
  job: Job;
  userId: string;
  initialEvaluations: Evaluation[];
  hasProfileResume: boolean;
}) {
  const supabase = createClient();

  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEvaluations[0]?.id ?? null,
  );
  const [hasProfileResume, setHasProfileResume] = useState(
    initialHasProfileResume,
  );
  const [resumeSource, setResumeSource] = useState<ResumeSource>(
    initialHasProfileResume && !job.tailored_resume?.trim()
      ? "profile"
      : "tailored",
  );
  const [resumeText, setResumeText] = useState(job.tailored_resume ?? "");
  // Only offered when there's no profile resume yet.
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read from the saved job, not the form above, so it updates once the job
  // details are saved (JobTrackerForm refreshes the page).
  const hasDescription = !!job.raw_description?.trim();
  const usesPastedResume = !hasProfileResume || resumeSource === "tailored";
  const selectedEvaluation =
    evaluations.find((e) => e.id === selectedId) ?? null;

  const savesAsProfileResume = !hasProfileResume && saveAsDefault;

  // Saves where the pasted resume goes before evaluating: the profile (when
  // saving it as the default), or the job as its tailored resume. Choosing
  // the profile resume clears any tailored one so the route falls back to it.
  const saveResumeChoice = async () => {
    if (savesAsProfileResume) {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          resume: resumeText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    }
    const tailoredResume =
      usesPastedResume && !savesAsProfileResume ? resumeText : null;
    const { error } = await supabase
      .from("jobs")
      .update({ tailored_resume: tailoredResume })
      .eq("id", job.id)
      .eq("user_id", userId);
    if (error) throw error;
  };

  const handleEvaluate = async () => {
    setError(null);
    if (usesPastedResume && !resumeText.trim()) {
      setError("Paste a resume to evaluate this job against.");
      return;
    }
    setIsEvaluating(true);

    try {
      await saveResumeChoice();
      if (savesAsProfileResume) {
        // It's the profile resume now; later evaluations default to it.
        setHasProfileResume(true);
        setResumeSource("profile");
      }

      const res = await fetch(`/api/jobs/${job.id}/evaluate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Evaluation failed.");

      const evaluation = data.evaluation as Evaluation;
      setEvaluations((prev) => [evaluation, ...prev]);
      setSelectedId(evaluation.id);
    } catch (err: unknown) {
      console.error("Job evaluation error:", err);
      setError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <section
      aria-labelledby="evaluation-heading"
      className="max-w-3xl mx-auto mt-8 space-y-6"
    >
      <div className="p-8 space-y-5 bg-card border border-border rounded-2xl shadow-card">
        <div>
          <h2
            id="evaluation-heading"
            className="text-xl font-extrabold tracking-tight text-foreground"
          >
            Evaluation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Score how well your resume fits this job.
          </p>
        </div>

        {!hasDescription ? (
          <p className="text-sm text-foreground">
            Add a job description in the details above and save to evaluate this
            job.
          </p>
        ) : (
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-foreground mb-2">
              Resume
            </legend>
            {hasProfileResume ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="resume-source"
                      value="profile"
                      checked={resumeSource === "profile"}
                      onChange={() => setResumeSource("profile")}
                      className="accent-primary"
                    />
                    My profile resume
                  </label>
                  <Link
                    href="/profile"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="resume-source"
                    value="tailored"
                    checked={resumeSource === "tailored"}
                    onChange={() => setResumeSource("tailored")}
                    className="accent-primary"
                  />
                  A resume tailored to this job
                </label>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t added a resume yet. Paste one to evaluate this
                job.
              </p>
            )}

            {usesPastedResume && (
              <div>
                <label
                  className="block text-[13px] font-semibold text-muted-foreground-strong mb-1.5"
                  htmlFor="evaluate-resume"
                >
                  {hasProfileResume ? "Tailored Resume" : "Your Resume"}
                </label>
                <textarea
                  id="evaluate-resume"
                  rows={8}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume here"
                  className={textareaClass}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your name, email, phone number, and website are removed before
                  your resume is shared with the AI evaluator.
                </p>
              </div>
            )}

            {!hasProfileResume && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Save as my default resume for other jobs too
              </label>
            )}
          </fieldset>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 rounded-md text-sm font-medium bg-red-50 text-red-800"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {isEvaluating && (
            <span className="text-xs text-muted-foreground">
              This can take up to a minute.
            </span>
          )}
          <Button
            type="button"
            onClick={handleEvaluate}
            disabled={!hasDescription || isEvaluating}
          >
            {isEvaluating
              ? "Evaluating..."
              : evaluations.length
                ? "Re-evaluate"
                : "Evaluate"}
          </Button>
        </div>
      </div>

      {evaluations.length > 1 && (
        <EvaluationHistory
          evaluations={evaluations}
          selectedEvaluationId={selectedId}
          onSelectEvaluation={setSelectedId}
        />
      )}

      {selectedEvaluation && (
        <EvaluationCard
          job={job}
          evaluation={selectedEvaluation}
          showHeader={false}
        />
      )}
    </section>
  );
}
