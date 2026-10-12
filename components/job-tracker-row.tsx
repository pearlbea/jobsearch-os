"use client";

import { Job } from "@/types/database";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/labels";
import { bandStyles, getScoreBand } from "@/lib/score-band";

export default function JobTrackerRow({ job }: { job: Job }) {
  const jobName = `${job.role_title} at ${job.company_name}`;
  const band =
    typeof job.match_score === "number"
      ? bandStyles[getScoreBand(job.match_score)]
      : null;

  return (
    <li className="lg:flex lg:items-center gap-4 p-4 border-b">
      <Link
        href={`/tracker/${job.id}`}
        className="flex-1 flex gap-4 text-left py-2 text-sm text-foreground focus:border-primary focus:ring-primary"
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
    </li>
  );
}
