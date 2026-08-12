"use client";

import { useState } from "react";
import { JobSummary } from "@/types/database";

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
      <div className="p-6 bg-white border rounded-xl text-center text-sm text-gray-500">
        No saved evaluations yet.
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

      <div className="divide-y max-h-[450px] overflow-y-auto">
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
              onClick={() => onSelectJob(job.id)}
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
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                type="button"
                disabled={deletingId === job.id}
                onClick={(e) => handleDelete(e, job.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete evaluation"
              >
                {deletingId === job.id ? "..." : "🗑️"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
