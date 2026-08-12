"use client";

import { useState } from "react";
import { JobSummary } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScoreBand } from "@/lib/score-band";

interface EvaluationsListProps {
  jobs: JobSummary[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export function EvaluationsList({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
}: EvaluationsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this evaluation?")) return;

    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      onDeleteJob(jobId);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Could not delete job evaluation.");
    } finally {
      setDeletingId(null);
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="p-6 bg-white border border-zinc-200 rounded-lg text-center text-sm text-zinc-500">
        No saved evaluations yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
        <h3 className="font-bold text-zinc-900 text-sm">
          Saved Evaluations ({jobs.length})
        </h3>
      </div>

      <div className="divide-y divide-zinc-100">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const score = job.match_score ?? 0;
          const band = getScoreBand(score);

          return (
            <div
              key={job.id}
              className={`flex items-center justify-between pr-4 transition-colors ${
                isSelected
                  ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                  : "hover:bg-zinc-50"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelectJob(job.id)}
                className="h-auto flex-1 flex-col items-start justify-start gap-0 space-y-1 whitespace-normal rounded-none p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 text-sm">
                    {job.role_title}
                  </span>
                  <Badge variant={band}>{score}%</Badge>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  {job.company_name}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === job.id}
                onClick={(e) => handleDelete(e, job.id)}
                className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
                title="Delete evaluation"
                aria-label="Delete evaluation"
              >
                {deletingId === job.id ? "..." : "🗑️"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
