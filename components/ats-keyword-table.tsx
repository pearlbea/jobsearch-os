import type { EvaluationSummary } from "@/types/database";

interface AtsKeywordTableProps {
  atsAnalysis: NonNullable<EvaluationSummary["ats_analysis"]>;
}

// Shows only what the evaluation can actually check: posting terms missing
// verbatim from the resume. No pass/fail rating, since how a given employer's
// ATS filters (if at all) isn't knowable from the posting.
export function AtsKeywordTable({ atsAnalysis }: AtsKeywordTableProps) {
  const { missing_exact_keywords } = atsAnalysis;

  return (
    <div className="bg-background border border-border rounded-xl px-5 py-4.5">
      <h3 className="text-[13px] font-bold text-foreground mb-1">
        Keyword match
      </h3>
      <p className="text-xs text-muted-foreground mb-3.5">
        Key terms from the posting that don&apos;t appear word for word in
        your resume.
      </p>
      {missing_exact_keywords.length ? (
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
      ) : (
        <p className="text-sm text-muted-foreground-strong">
          Every key term in the posting appears in your resume.
        </p>
      )}
    </div>
  );
}
