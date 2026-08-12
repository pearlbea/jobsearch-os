"use client";

import { useState } from "react";
import { Job } from "@/types/database";

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
      className="bg-white border rounded-xl shadow-sm p-6 space-y-4"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          Evaluate a New Job Posting
        </h3>
        <p className="text-xs text-gray-500">
          Paste the raw text of a job posting to run it through your AI matching
          engine.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 text-xs font-medium rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Job Listing URL (Optional)
        </label>
        <input
          type="url"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://company.com/careers/role"
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Raw Job Description Text
        </label>
        <textarea
          rows={8}
          required
          value={rawDescription}
          onChange={(e) => setRawDescription(e.target.value)}
          placeholder="Paste the complete job description here..."
          className="w-full px-3 py-2 border rounded-md text-sm font-sans"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !rawDescription.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-md shadow hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Evaluating Listing..." : "Evaluate Match"}
        </button>
      </div>
    </form>
  );
}
