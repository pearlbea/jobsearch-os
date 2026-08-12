"use client";

import { useState, useEffect } from "react";
import { JobSummary } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { EvaluationsList } from "@/components/evaluations-list";
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJob: (jobId: string) => void;
}

export function HistoryModal({ open, onOpenChange, onSelectJob }: HistoryModalProps) {
  const [jobSummaries, setJobSummaries] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchSummaries() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, role_title, company_name, match_score, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setJobSummaries((data as JobSummary[]) || []);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSummaries();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDeleteJob = (jobId: string) => {
    setJobSummaries((prev) => prev.filter((j) => j.id !== jobId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
          <DialogTitle>History</DialogTitle>
          <p className="text-[12.5px] text-zinc-500 mt-0.5">
            Every job posting you&apos;ve evaluated, most recent first.
          </p>
        </div>
        <div className="p-5 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading saved evaluations...
            </div>
          ) : (
            <EvaluationsList
              jobs={jobSummaries}
              selectedJobId={null}
              onSelectJob={onSelectJob}
              onDeleteJob={handleDeleteJob}
            />
          )}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
