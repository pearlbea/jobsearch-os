"use client";

import { Evaluation } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bandStyles, getScoreBand } from "@/lib/score-band";

interface EvaluationHistoryProps {
  evaluations: Evaluation[];
  selectedEvaluationId: string | null;
  onSelectEvaluation: (evaluationId: string) => void;
}

export function EvaluationHistory({
  evaluations,
  selectedEvaluationId,
  onSelectEvaluation,
}: EvaluationHistoryProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[13px] font-bold text-muted-foreground-strong uppercase tracking-wide">
          Evaluation History ({evaluations.length})
        </h2>
      </div>

      <div className="divide-y divide-border-subtle">
        {evaluations.map((evaluation, idx) => {
          const isSelected = evaluation.id === selectedEvaluationId;
          const band = getScoreBand(evaluation.match_score);

          return (
            <div
              key={evaluation.id}
              className={`flex items-center transition-colors border-l-[3px] ${
                isSelected
                  ? "bg-accent border-primary"
                  : "border-transparent hover:bg-background"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelectEvaluation(evaluation.id)}
                className="h-auto flex-1 flex-col items-start justify-start gap-0 space-y-1.5 whitespace-normal rounded-none p-4 text-left"
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="font-bold text-foreground text-sm leading-snug">
                    {idx === 0 ? "Latest" : `Evaluation ${evaluations.length - idx}`}
                  </span>
                  <Badge variant={band}>{bandStyles[band].label}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(evaluation.created_at).toLocaleString()}
                </p>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
