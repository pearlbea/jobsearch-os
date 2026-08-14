"use client";

import { useState } from "react";
import { Job } from "@/types/database";
import { Button } from "@/components/ui/button";

interface JobEvaluatorFormProps {
  onEvaluationComplete: (job: Job) => void;
}

export function JobEvaluatorForm({
  onEvaluationComplete,
}: JobEvaluatorFormProps) {
  const [rawDescription, setRawDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rawDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/evaluate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_description: rawDescription,
          job_url: jobUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to evaluate job posting.");
      }

      onEvaluationComplete(data.job);
      setRawDescription("");
      setJobUrl("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Evaluation submission error:", err);
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl px-8 py-7 shadow-[0_6px_20px_rgba(60,45,20,0.05)] flex flex-col gap-4.5"
    >
      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-1">
          Evaluate a New Job Posting
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste the raw text of a job posting to run it through your AI
          matching engine.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-xs font-medium rounded-md">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="job-url"
          className="block text-[13px] font-semibold text-[#5C564C] mb-1.5"
        >
          Job Listing URL (Optional)
        </label>
        <input
          id="job-url"
          type="url"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://company.com/careers/role"
          className="w-full h-11 px-3.5 border border-[#E2DACB] rounded-[10px] text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <label
          htmlFor="raw-description"
          className="block text-[13px] font-semibold text-[#5C564C] mb-1.5"
        >
          Raw Job Description Text
        </label>
        <textarea
          id="raw-description"
          rows={5}
          required
          value={rawDescription}
          onChange={(e) => setRawDescription(e.target.value)}
          placeholder="Paste the complete job description here…"
          className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground placeholder:text-muted-foreground font-sans resize-y"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || !rawDescription.trim()}
          size="lg"
          className="px-6"
        >
          {isLoading ? "Evaluating listing..." : "Evaluate Match"}
        </Button>
      </div>
    </form>
  );
}
