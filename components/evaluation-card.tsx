import { Job, EvaluationSummary } from "@/types/database";
import { ScoreRing } from "@/components/score-ring";
import { AtsKeywordTable } from "@/components/ats-keyword-table";
import { Badge } from "@/components/ui/badge";
import { bandStyles, getScoreBand } from "@/lib/score-band";

interface EvaluationCardProps {
  job: Job;
}

export function EvaluationCard({ job }: EvaluationCardProps) {
  const evalData = job.evaluation_summary as EvaluationSummary | undefined;

  if (!evalData) {
    return (
      <div className="p-6 bg-white border border-zinc-200 rounded-lg text-zinc-500 text-sm">
        No evaluation summary available for this job.
      </div>
    );
  }

  const {
    score_breakdown,
    key_strengths,
    potential_gaps,
    positioning_advice,
    parsed_requirements,
    ats_analysis,
  } = evalData;

  // Prefer the top-level `jobs.match_score` column — it's always populated
  // by the insert (see app/api/evaluate-job/route.ts) — over the nested
  // evaluation_summary copy, which can be missing on older rows.
  const matchScore = job.match_score ?? evalData.match_score ?? 0;
  const band = getScoreBand(matchScore);

  return (
    <div className="flex flex-col md:flex-row md:items-start gap-6">
      {/* Score column */}
      <div className="md:w-[280px] md:shrink-0 border border-zinc-200 rounded-[10px] p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-zinc-900">
            {job.role_title}
          </h2>
          <p className="text-[12.5px] text-zinc-500 mt-0.5">
            {job.company_name}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {job.location || "Location not specified"}
          </p>
          {(parsed_requirements?.is_remote || parsed_requirements?.salary_range) && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {parsed_requirements?.is_remote && (
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
                  Remote
                </span>
              )}
              {parsed_requirements?.salary_range && (
                <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[11px] font-medium">
                  {parsed_requirements.salary_range}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 py-3.5 border-t border-b border-zinc-100">
          <ScoreRing score={matchScore} />
          <Badge variant={band}>{bandStyles[band].label}</Badge>
        </div>

        <div className="flex flex-col gap-2.5">
          <ScoreBar label="Technical" score={score_breakdown?.technical_match || 0} />
          <ScoreBar label="Domain" score={score_breakdown?.domain_match || 0} />
          <ScoreBar label="Leadership" score={score_breakdown?.leadership_match || 0} />
        </div>
      </div>

      {/* Report column */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4.5 py-4">
          <h3 className="text-[12.5px] font-bold text-indigo-700 mb-1.5">
            Recommended positioning strategy
          </h3>
          <p className="text-[13.5px] leading-relaxed text-indigo-800">
            {positioning_advice}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-zinc-200 rounded-lg px-4.5 py-4">
            <h4 className="text-[13px] font-bold text-green-700 mb-2.5">
              Key matching strengths
            </h4>
            <ul className="flex flex-col gap-2 text-[13px] text-zinc-700 leading-relaxed">
              {key_strengths?.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">＋</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-zinc-200 rounded-lg px-4.5 py-4">
            <h4 className="text-[13px] font-bold text-amber-700 mb-2.5">
              Potential gaps / friction
            </h4>
            <ul className="flex flex-col gap-2 text-[13px] text-zinc-700 leading-relaxed">
              {potential_gaps?.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">－</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {ats_analysis && <AtsKeywordTable atsAnalysis={ats_analysis} />}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-zinc-900 mb-1.5">
        <span>{label}</span>
        <span className="text-zinc-500 font-normal">{score}%</span>
      </div>
      <div className="h-[5px] rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
