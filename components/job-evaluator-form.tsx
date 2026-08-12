"use client";

import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { Job } from "@/types/database";
import { cn } from "@/lib/utils";

interface JobEvaluatorFormProps {
  onEvaluationComplete: (job: Job) => void;
  open?: boolean;
  onOpenChange?: (open: boolean, ...args: unknown[]) => void;
}

export function JobEvaluatorForm({
  onEvaluationComplete,
  open,
  onOpenChange,
}: JobEvaluatorFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const [rawDescription, setRawDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = open ?? uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean, ...args: unknown[]) => {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, ...args);
  };

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
    <Collapsible.Root
      {...(open !== undefined ? { open } : { defaultOpen: true })}
      onOpenChange={handleOpenChange}
      className="border border-zinc-200 rounded-[10px]"
    >
      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <h2 className="text-[14.5px] font-bold text-zinc-900">
          Evaluate a new job posting
        </h2>
        <Collapsible.Trigger className="flex items-center gap-1 text-[13px] font-semibold text-zinc-600 hover:text-zinc-900">
          {isOpen ? "Hide" : "New evaluation"}
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              !isOpen && "-rotate-90",
            )}
          />
        </Collapsible.Trigger>
      </div>

      <Collapsible.Panel>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3.5 px-5 pb-5 sm:px-6 sm:pb-6"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3.5">
            <div className="flex-1">
              <label htmlFor="job-url" className="sr-only">
                Job listing URL (optional)
              </label>
              <input
                id="job-url"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="Job listing URL (optional)"
                className="w-full h-9 px-3 border border-zinc-200 rounded-[7px] text-[13px] text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !rawDescription.trim()}
              className="px-4.5 h-9 bg-zinc-900 text-white font-semibold text-[13px] rounded-[7px] hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Evaluating listing..." : "Evaluate match"}
            </button>
          </div>

          <div>
            <label htmlFor="raw-description" className="sr-only">
              Raw job description text
            </label>
            <textarea
              id="raw-description"
              rows={4}
              required
              value={rawDescription}
              onChange={(e) => setRawDescription(e.target.value)}
              placeholder="Paste the complete job description here…"
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-[7px] text-[13px] text-zinc-900 placeholder:text-zinc-400 font-sans"
            />
          </div>
        </form>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
