"use client";

import { Job } from "@/types/database";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/labels";

export default function JobTrackerRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/tracker/${job.id}`}
      className="h-auto flex gap-4 rounded-none text-left p-4"
    >
      <ul className="flex gap-1">
        <li>{job.role_title}</li>
        <li className="font-bold">{job.company_name}</li>
        <li>{job.status ? STATUS_LABELS[job.status] : "No status"}</li>
        <li>{job.match_score}%</li>
        <li>{new Date(job.created_at).toLocaleDateString()}</li>
      </ul>
    </Link>
  );
}
