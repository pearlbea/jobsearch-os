"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/types/database";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";

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

  return (
    <li className="flex items-center gap-4 p-4">
      <Link
        href={`/tracker/${job.id}`}
        className="flex-1 flex gap-4 text-left"
      >
        <ul className="flex gap-1">
          <li>{job.role_title}</li>
          <li className="font-bold">{job.company_name}</li>
          <li>{job.status ? STATUS_LABELS[job.status] : "No status"}</li>
          <li>
            {job.match_score === null ? "Not evaluated" : `${job.match_score}%`}
          </li>
          <li>{new Date(job.created_at).toLocaleDateString()}</li>
        </ul>
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
        aria-label={`Delete ${job.role_title} at ${job.company_name}`}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </li>
  );
}
