"use client";

import { Job } from "@/types/database";
import Link from "next/link";

export default function JobTrackerRow({ job }: { job: Job }) {
  return (
    <Link
      href={`/tracker/${job.id}`}
      className="h-auto flex gap-4 rounded-none text-left p-4"
    >
      <ul className="flex gap-1">
        <li>{job.role_title}</li>
        <li className="font-bold">{job.company_name}</li>
        <li>{job.status}</li>
        <li>{job.match_score}%</li>
        <li>{new Date(job.created_at).toLocaleDateString()}</li>
      </ul>
    </Link>
  );
}
