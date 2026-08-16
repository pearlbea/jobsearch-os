"use client";

import { RotateCw } from "lucide-react";
import { JobSummary } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getScoreBand } from "@/lib/score-band";

interface EvaluationsListProps {
  jobs: JobSummary[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onReevaluateJob?: (jobId: string) => void;
  reevaluatingJobId?: string | null;
}

export function EvaluationsList({
  jobs,
  selectedJobId,
  onSelectJob,
  onReevaluateJob,
  reevaluatingJobId,
}: EvaluationsListProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(60,45,20,0.05)]">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-bold text-muted-foreground-strong uppercase tracking-wide">
          Saved Evaluations ({jobs.length})
        </h2>
      </div>

      <div className="divide-y divide-[#F3EEE4]">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const score = job.match_score ?? 0;
          const band = getScoreBand(score);
          const isReevaluatingThis = reevaluatingJobId === job.id;

          return (
            <div
              key={job.id}
              className={`flex items-center transition-colors border-l-[3px] ${
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
                <div className="flex items-center justify-between gap-2 w-full">
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

              {onReevaluateJob && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mr-2 shrink-0 text-muted-foreground"
                        disabled={isReevaluatingThis}
                        aria-label="Re-evaluate with current resume"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReevaluateJob(job.id);
                        }}
                      >
                        <RotateCw
                          className={cn(
                            "size-3.5",
                            isReevaluatingThis && "animate-spin",
                          )}
                        />
                      </Button>
                    }
                  />
                  <TooltipContent>Re-evaluate with current resume</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
