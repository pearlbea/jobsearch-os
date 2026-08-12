"use client";

import { useState } from "react";
import { Job } from "@/types/database";

interface EvaluationsListProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (job: Job) => void;
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
    e.stopPropagation(); // Don't trigger onSelectJob
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
      <div className="p-6 bg-white border rounded-xl text-center text-sm text-gray-500">
        No saved evaluations yet. Paste a job description above to create one.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-sm">
          Saved Evaluations ({jobs.length})
        </h3>
      </div>

      <div className="divide-y max-h-[400px] overflow-y-auto">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const score = job.match_score ?? 0;

          const getBadgeColor = (s: number) => {
            if (s >= 80) return "bg-green-100 text-green-800";
            if (s >= 60) return "bg-amber-100 text-amber-800";
            return "bg-red-100 text-red-800";
          };

          return (
            <div
              key={job.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectJob(job);
              }}
              onClick={() => onSelectJob(job)}
              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50/70 border-l-4 border-blue-600"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">
                    {job.role_title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${getBadgeColor(score)}`}
                  >
                    {score}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {job.company_name}
                </p>
                <p className="text-[11px] text-gray-400">
                  Evaluated {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                type="button"
                disabled={deletingId === job.id}
                onClick={(e) => handleDelete(e, job.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete evaluation"
                aria-label="Delete evaluation"
              >
                {deletingId === job.id ? (
                  <span className="text-xs text-gray-400">...</span>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
