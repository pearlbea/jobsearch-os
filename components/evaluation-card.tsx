import { Job, Evaluation } from "@/types/database";
import { AtsKeywordTable } from "@/components/ats-keyword-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { bandStyles, getScoreBand } from "@/lib/score-band";
import { SCORE_DIMENSIONS } from "@/lib/score-dimensions";

interface EvaluationCardProps {
  job: Job;
  evaluation: Evaluation;
  onReevaluate?: () => void;
  isReevaluating?: boolean;
}

export function EvaluationCard({
  job,
  evaluation,
  onReevaluate,
  isReevaluating,
}: EvaluationCardProps) {
  const {
    match_score: matchScore,
    evaluation_summary: {
      score_breakdown,
      key_strengths,
      potential_gaps,
      positioning_advice,
      ats_analysis,
    },
  } = evaluation;

  const band = getScoreBand(matchScore);
  const badge = bandStyles[band];

  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-[0_6px_20px_rgba(60,45,20,0.05)]">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
            {job.role_title}
          </h2>
          <div className="text-[15px] text-muted-foreground-strong mb-2">
            {job.company_name}
          </div>
          {job.job_url && (
            <div className="text-[15px] text-muted-foreground-strong mb-2">
              <Link
                className="text-sm text-muted-foreground hover:text-foreground"
                href={job.job_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {job.job_url}
              </Link>
            </div>
          )}
        </div>
        <div
          className="text-center rounded-xl px-5.5 py-3 min-w-[100px] shrink-0"
          style={{
            background: badge.badgeBg,
            border: `1px solid ${badge.badgeColor}33`,
          }}
        >
          <div
            className="text-2xl font-extrabold leading-none"
            style={{ color: badge.badgeColor }}
          >
            {matchScore}%
          </div>
          <div
            className="text-[10px] font-bold tracking-wide mt-1"
            style={{ color: badge.badgeColor }}
          >
            MATCH SCORE
          </div>
        </div>
      </div>

      <div className="text-xs font-bold text-muted-foreground tracking-wide mb-3">
        SCORE BREAKDOWN
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <ScoreBar
          label={SCORE_DIMENSIONS.tech.label}
          score={score_breakdown?.[SCORE_DIMENSIONS.tech.fullKey]}
          description={SCORE_DIMENSIONS.tech.description}
        />
        <ScoreBar
          label={SCORE_DIMENSIONS.domain.label}
          score={score_breakdown?.[SCORE_DIMENSIONS.domain.fullKey]}
          description={SCORE_DIMENSIONS.domain.description}
        />
        <ScoreBar
          label={SCORE_DIMENSIONS.scope.label}
          score={score_breakdown?.[SCORE_DIMENSIONS.scope.fullKey]}
          description={SCORE_DIMENSIONS.scope.description}
        />
      </div>

      <div className="bg-background border-l-[3px] border-primary rounded-[10px] px-5 py-4 mb-7">
        <h3 className="text-[13px] font-bold text-foreground mb-1.5">
          Recommended Positioning Strategy
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground-strong">
          {positioning_advice}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <h4
            className="text-[13px] font-bold mb-3"
            style={{ color: "#1E7A4C" }}
          >
            Key Matching Strengths
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground-strong leading-relaxed">
            {key_strengths?.length ? (
              key_strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span style={{ color: "#1E7A4C" }} className="mt-0.5">
                    ●
                  </span>
                  <span>{strength}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                No standout strengths identified.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4
            className="text-[13px] font-bold mb-3"
            style={{ color: "#9D681B" }}
          >
            Potential Gaps / Friction Areas
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground-strong leading-relaxed">
            {potential_gaps?.length ? (
              potential_gaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span style={{ color: "#9D681B" }} className="mt-0.5">
                    ●
                  </span>
                  <span>{gap}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                No significant gaps identified.
              </li>
            )}
          </ul>
        </div>
      </div>

      {ats_analysis && <AtsKeywordTable atsAnalysis={ats_analysis} />}

      {onReevaluate && (
        <div className="flex justify-end mt-6 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onReevaluate}
            disabled={isReevaluating}
          >
            {isReevaluating
              ? "Re-evaluating..."
              : "Re-evaluate with current resume"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  score,
  description,
}: {
  label: string;
  score: number | undefined;
  description: string;
}) {
  const hasScore = typeof score === "number";
  const color = hasScore
    ? bandStyles[getScoreBand(score)].barColor
    : "var(--muted-foreground)";

  return (
    <div className="bg-background rounded-[10px] px-4 py-3.5">
      <div className="flex justify-between text-[13px] mb-2">
        <Tooltip>
          <TooltipTrigger
            aria-label={`What ${label} measures`}
            className="font-semibold text-muted-foreground-strong underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {label}
          </TooltipTrigger>
          <TooltipContent className="max-w-56 text-center font-normal">
            {description}
          </TooltipContent>
        </Tooltip>
        <span className="font-bold" style={{ color }}>
          {hasScore ? `${score}%` : "N/A"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: hasScore ? `${score}%` : "0%", background: color }}
        />
      </div>
    </div>
  );
}
