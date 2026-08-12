"use client";

import { Job, EvaluationSummary } from "@/types/database";

interface EvaluationCardProps {
  job: Job;
}

export function EvaluationCard({ job }: EvaluationCardProps) {
  const evalData = job.evaluation_summary as EvaluationSummary | undefined;

  if (!evalData) {
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm text-gray-500">
        No evaluation summary available for this job.
      </div>
    );
  }

  const {
    match_score,
    score_breakdown,
    key_strengths,
    potential_gaps,
    positioning_advice,
    parsed_requirements,
  } = evalData;

  // Color helper based on fit score
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
      {/* Header: Title, Company, Overall Score */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{job.role_title}</h2>
          <p className="text-lg text-gray-600 font-medium">
            {job.company_name}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>📍 {job.location || "Location not specified"}</span>
            {parsed_requirements?.is_remote && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Remote
              </span>
            )}
            {parsed_requirements?.salary_range && (
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                💰 {parsed_requirements.salary_range}
              </span>
            )}
          </div>
        </div>

        {/* Big Overall Match Score Badge */}
        <div
          className={`flex flex-col items-center justify-center p-4 rounded-xl border ${getScoreBadgeColor(match_score)} min-w-[120px]`}
        >
          <span className="text-3xl font-extrabold">{match_score}%</span>
          <span className="text-xs font-semibold uppercase tracking-wider mt-1">
            Match Score
          </span>
        </div>
      </div>

      {/* Category Breakdown Bars */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Score Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Positioning & Messaging Strategy */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h4 className="text-sm font-bold text-blue-900 mb-1">
          Recommended Positioning Strategy
        </h4>
        <p className="text-sm text-blue-800 leading-relaxed">
          {positioning_advice}
        </p>
      </div>

      {/* Strengths and Gaps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Key Strengths */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
            <span>✅</span> Key Matching Strengths
          </h4>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {key_strengths?.map((strength, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 bg-green-50/50 p-2.5 rounded-md border border-green-100"
              >
                <span className="text-green-600 font-bold">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Potential Gaps */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <span>⚠️</span> Potential Gaps / Friction Areas
          </h4>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {potential_gaps?.map((gap, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-md border border-amber-100"
              >
                <span className="text-amber-600 font-bold">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ATS Diagnostic Section */}
        {evalData.ats_analysis && (
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                🤖 ATS Filter Simulation
              </h4>
              <span
                className={`text-xs px-2 py-0.5 rounded font-bold ${
                  evalData.ats_analysis.ats_pass_probability === "High"
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : evalData.ats_analysis.ats_pass_probability === "Medium"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {evalData.ats_analysis.ats_pass_probability} ATS Pass Rate
              </span>
            </div>

            {evalData.ats_analysis.missing_exact_keywords.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  Missing Verbatim Keywords:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evalData.ats_analysis.missing_exact_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-red-950 text-red-200 border border-red-800 rounded font-mono"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="p-3 bg-gray-50 border rounded-lg space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-gray-700">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
