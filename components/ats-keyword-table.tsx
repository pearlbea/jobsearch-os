import { bandStyles, getAtsBand } from "@/lib/score-band";
import type { EvaluationSummary } from "@/types/database";

interface AtsKeywordTableProps {
  atsAnalysis: NonNullable<EvaluationSummary["ats_analysis"]>;
}

export function AtsKeywordTable({ atsAnalysis }: AtsKeywordTableProps) {
  const { missing_exact_keywords, ats_pass_probability } = atsAnalysis;
  const band = getAtsBand(ats_pass_probability);
  const badge = bandStyles[band];

  return (
    <div className="bg-background border border-border rounded-xl px-5 py-4.5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-[13px] font-bold text-foreground">
          ATS Filter Simulation
        </span>
        <span
          className="text-[11px] font-bold rounded-full px-2.5 py-1"
          style={{
            background: badge.badgeBg,
            color: badge.badgeColor,
            border: `1px solid ${badge.badgeColor}33`,
          }}
        >
          {ats_pass_probability} ATS Pass Rate
        </span>
      </div>
      <div className="text-xs font-semibold text-muted-foreground mb-2.5">
        Missing Verbatim Keywords
      </div>
      <div className="flex flex-wrap gap-2">
        {missing_exact_keywords.map((keyword, idx) => (
          <span
            key={`${keyword}-${idx}`}
            className="text-[13px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FBD5D5] rounded-full px-3 py-1"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
