"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Shown on a tracker job that hasn't been evaluated yet: saves the pasted
// posting onto the job, then runs the same re-evaluate endpoint the evaluator
// uses, so the evaluation attaches to this job instead of creating a new one.
export default function JobEvaluateForm({
  jobId,
  userId,
  initialDescription,
}: {
  jobId: string;
  userId: string;
  initialDescription: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [description, setDescription] = useState(initialDescription ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!description.trim()) {
      setError("Paste the job description to evaluate it.");
      return;
    }
    setIsSubmitting(true);

    try {
      const { error: saveError } = await supabase
        .from("jobs")
        .update({
          raw_description: description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("user_id", userId);
      if (saveError) throw saveError;

      const res = await fetch(`/api/jobs/${jobId}/evaluate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Evaluation failed.");
      }

      // The page re-renders with the evaluation and replaces this form.
      router.refresh();
    } catch (err: unknown) {
      console.error("Job evaluate error:", err);
      setError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="evaluate-heading"
      className="max-w-3xl mx-auto mt-8 p-8 space-y-4 bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(60,45,20,0.05)]"
    >
      <div>
        <h2
          id="evaluate-heading"
          className="text-xl font-extrabold tracking-tight text-foreground"
        >
          Evaluate This Job
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Paste the job description to get a fit evaluation against your
          profile.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-md text-sm font-medium bg-red-50 text-red-800"
        >
          {error}
        </div>
      )}

      <div>
        <label
          className="block text-[13px] font-semibold text-muted-foreground-strong mb-1.5"
          htmlFor="job-evaluate-description"
        >
          Job Description
        </label>
        <textarea
          id="job-evaluate-description"
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the job description here"
          className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Evaluating..." : "Save and Evaluate"}
        </Button>
      </div>
    </form>
  );
}
