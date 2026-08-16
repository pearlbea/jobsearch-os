import { Job, Evaluation } from "@/types/database";
import { AtsKeywordTable } from "@/components/ats-keyword-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { bandStyles, getScoreBand } from "@/lib/score-band";

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
      parsed_requirements,
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
          {job.job_url && /^https?:\/\//i.test(job.job_url) && (
            <div className="text-[15px] text-muted-foreground-strong mb-2">
              <Link
                className="text-sm text-muted-foreground hover:text-foreground"
                href={job.job_url}
                prefetch={false}
                rel="noopener noreferrer"
                target="_blank"
              >
                {job.job_url}
              </Link>
            </div>
          )}
          <div className="text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{job.location || "Location not specified"}</span>
            {parsed_requirements?.is_remote && (
              <span className="px-2 py-0.5 rounded bg-accent text-primary text-[11px] font-semibold">
                Remote
              </span>
            )}
            {parsed_requirements?.salary_range && (
              <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[11px] font-medium">
                {parsed_requirements.salary_range}
              </span>
            )}
          </div>
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
          label="Technical Match"
          score={score_breakdown?.technical_match || 0}
        />
        <ScoreBar
          label="Domain Match"
          score={score_breakdown?.domain_match || 0}
        />
        <ScoreBar
          label="Leadership / Scope"
          score={score_breakdown?.leadership_match || 0}
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
            {key_strengths?.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span style={{ color: "#1E7A4C" }} className="mt-0.5">
                  ●
                </span>
                <span>{strength}</span>
              </li>
            ))}
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
            {potential_gaps?.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span style={{ color: "#9D681B" }} className="mt-0.5">
                  ●
                </span>
                <span>{gap}</span>
              </li>
            ))}
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

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = bandStyles[getScoreBand(score)].barColor;

  return (
    <div className="bg-background rounded-[10px] px-4 py-3.5">
      <div className="flex justify-between text-[13px] mb-2">
        <span className="font-semibold text-muted-foreground-strong">{label}</span>
        <span className="font-bold" style={{ color }}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
