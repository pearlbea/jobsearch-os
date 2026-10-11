"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/database";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { bandStyles, getScoreBand } from "@/lib/score-band";

export default function JobTrackerRow({ job }: { job: Job }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete ${job.role_title} at ${job.company_name}? Its evaluations and interactions will be deleted too.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete job.");
      }
      router.refresh();
    } catch (err: unknown) {
      console.error("Job delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete job.");
      setIsDeleting(false);
    }
  };

  const jobName = `${job.role_title} at ${job.company_name}`;
  const band =
    typeof job.match_score === "number"
      ? bandStyles[getScoreBand(job.match_score)]
      : null;

  return (
    <li className="flex items-center gap-4 p-4">
      <Link
        href={`/tracker/${job.id}`}
        className="flex-1 flex gap-4 text-left px-3.5 py-2 border border-input rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary"
      >
        <ul className="flex justify-between w-full gap-1">
          <li>
            {job.role_title},{" "}
            <span className="font-bold">{job.company_name}</span>
          </li>
          <li>{job.status ? STATUS_LABELS[job.status] : "No status"}</li>
        </ul>
      </Link>
      <Link
        href={`/tracker/${job.id}/evaluation`}
        aria-label={
          band
            ? `${band.label}: view evaluation for ${jobName}`
            : `Evaluate ${jobName}`
        }
        className={
          band
            ? `shrink-0 px-2.5 py-1 border rounded-full text-xs font-bold ${band.badgeClassName}`
            : "shrink-0 text-sm font-semibold text-primary hover:underline"
        }
      >
        {band ? band.label : "Evaluate"}
      </Link>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isDeleting}
        onClick={handleDelete}
        aria-label={`Delete ${jobName}`}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </li>
  );
}
