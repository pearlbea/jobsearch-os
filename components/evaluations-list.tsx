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

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(60,45,20,0.05)]">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-bold text-[#5C564C] uppercase tracking-wide">
          Saved Evaluations ({jobs.length})
        </h2>
      </div>

      <div className="divide-y divide-[#F3EEE4]">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const score = job.match_score ?? 0;
          const band = getScoreBand(score);

          return (
            <div
              key={job.id}
              className={`flex items-center justify-between pr-3 transition-colors border-l-[3px] ${
                isSelected
                  ? "bg-accent border-primary"
                  : "border-transparent hover:bg-background"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelectJob(job.id)}
                className="h-auto flex-1 flex-col items-start justify-start gap-0 space-y-1.5 whitespace-normal rounded-none p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm leading-snug">
                    {job.role_title}
                  </span>
                  <Badge variant={band}>{score}%</Badge>
                </div>
                <p className="text-[13px] text-muted-foreground font-medium">
                  {job.company_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === job.id}
                onClick={(e) => handleDelete(e, job.id)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
