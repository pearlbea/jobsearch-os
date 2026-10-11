"use client";

import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { SCORE_DIMENSIONS } from "@/lib/score-dimensions";

interface EvaluationCardProps {
  job: Job;
  evaluation: Evaluation;
  onReevaluate?: () => void;
  isReevaluating?: boolean;
  /** Hide the role/company/URL header, e.g. on the job page, which shows them already. */
  showHeader?: boolean;
}

export function EvaluationCard({
  job,
  evaluation,
  onReevaluate,
  isReevaluating,
  showHeader = true,
}: EvaluationCardProps) {
  const {
    match_score: matchScore,
    evaluation_summary: {
      score_breakdown,
      key_strengths,
      potential_gaps,
      positioning_advice,
      ats_analysis,
      talking_points,
    },
  } = evaluation;
  const hasTalkingPoints = !!talking_points?.length;

  const band = getScoreBand(matchScore);
  const badge = bandStyles[band];

  const overallBadge = (
    <div
      className={cn(
        "flex flex-col justify-center text-center rounded-xl border px-5.5 py-1",
        // Beside the breakdown: skip its heading (text-xs line + mb-3) so the
        // badge lines up with the score items.
        !showHeader && "sm:mt-7",
        badge.badgeClassName,
      )}
    >
      <div className="text-[10px] font-bold tracking-wide mb-1">OVERALL</div>
      <div className="text-xl font-extrabold leading-none">{badge.label}</div>
    </div>
  );

  const breakdown = (
    <>
      <div className="text-xs font-bold text-muted-foreground tracking-wide mb-3">
        SCORE BREAKDOWN
      </div>
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-3 gap-4",
          showHeader && "mb-7",
        )}
      >
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
    </>
  );

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl shadow-card",
        showHeader ? "p-8" : "p-5",
      )}
    >
      <p className="flex items-start gap-2 text-xs text-muted-foreground mb-5">
        <Info aria-hidden="true" className="size-3.5 mt-0.5 shrink-0" />
        <span>
          {`AI-generated from your resume and this job description. The ${
            hasTalkingPoints
              ? "scores, strengths, gaps, and talking points"
              : "scores, strengths, and gaps"
          } may be inaccurate. Check them against your own experience before relying on them.`}
        </span>
      </p>

      <div
        className={cn(
          "flex gap-4",
          showHeader
            ? "justify-between items-start mb-6"
            : "flex-col sm:flex-row sm:items-stretch mb-6",
        )}
      >
        {showHeader ? (
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-1">
              {job.role_title}
            </h2>
            <div className="text-[15px] text-muted-foreground-strong mb-2">
              {job.company_name}
            </div>
            {job.job_url && /^https?:\/\//i.test(job.job_url) && (
              <div className="text-[15px] text-muted-foreground-strong mb-2">
                <Link
                  className="text-sm text-muted-foreground hover:text-foreground text-nowrap truncate max-w-full inline-block"
                  href={job.job_url}
                  prefetch={false}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {job.job_url}
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {!showHeader && <div className="flex-1">{breakdown}</div>}
        {overallBadge}
      </div>

      {showHeader && breakdown}

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
          <h4 className="text-[13px] font-bold mb-3 text-band-good">
            Key Matching Strengths
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground-strong leading-relaxed">
            {key_strengths?.length ? (
              key_strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 text-band-good">●</span>
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
          <h4 className="text-[13px] font-bold mb-3 text-band-stretch-bar">
            Potential Gaps / Friction Areas
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground-strong leading-relaxed">
            {potential_gaps?.length ? (
              potential_gaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 text-band-stretch-bar">●</span>
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

      {hasTalkingPoints && <TalkingPoints points={talking_points} />}

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
              : "Re-evaluate with updated resume"}
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
  const band =
    typeof score === "number" ? bandStyles[getScoreBand(score)] : null;

  return (
    <div className="bg-background rounded-[10px] px-4 py-3.5 flex flex-col justify-between">
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
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            band?.barClassName,
          )}
          style={{ width: band ? `${score}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={label}
      onClick={copy}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function TalkingPoints({
  points,
}: {
  points: { point: string; evidence: string }[];
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-bold text-foreground">
          Talking points
        </h4>
        <CopyButton
          label="Copy all talking points"
          text={points.map((p) => p.point).join("\n\n")}
        />
      </div>
      <ul className="flex flex-col gap-3">
        {points.map((p, idx) => (
          <li
            key={idx}
            className="flex items-start justify-between gap-3 bg-background rounded-[10px] px-4 py-3"
          >
            <div className="text-sm leading-relaxed text-muted-foreground-strong">
              <p>{p.point}</p>
              <p className="text-xs text-muted-foreground mt-1">
                From your resume: {p.evidence}
              </p>
            </div>
            <CopyButton
              label={`Copy talking point ${idx + 1}`}
              text={p.point}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
