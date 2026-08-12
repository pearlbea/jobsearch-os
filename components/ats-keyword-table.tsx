import { Badge } from "@/components/ui/badge";
import { getAtsBand } from "@/lib/score-band";
import type { EvaluationSummary } from "@/types/database";

interface AtsKeywordTableProps {
  atsAnalysis: NonNullable<EvaluationSummary["ats_analysis"]>;
}

export function AtsKeywordTable({ atsAnalysis }: AtsKeywordTableProps) {
  const { missing_exact_keywords, ats_pass_probability } = atsAnalysis;
  const band = getAtsBand(ats_pass_probability);
  const half = Math.ceil(missing_exact_keywords.length / 2);
  const columns = [
    missing_exact_keywords.slice(0, half),
    missing_exact_keywords.slice(half),
  ].filter((col) => col.length > 0);

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <span className="text-[13px] font-bold text-zinc-900">
          ATS keyword check
        </span>
        <Badge variant={band}>
          {missing_exact_keywords.length} missing
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 text-[13px]">
        {columns.map((column, colIdx) => (
          <div
            key={colIdx}
            className={
              colIdx === 1 ? "flex flex-col border-l border-zinc-100" : "flex flex-col"
            }
          >
            {column.map((keyword, rowIdx) => (
              <div
                key={`${keyword}-${rowIdx}`}
                className={
                  rowIdx === column.length - 1
                    ? "flex justify-between px-4 py-2.5"
                    : "flex justify-between px-4 py-2.5 border-b border-zinc-100"
                }
              >
                <span>{keyword}</span>
                <span className="font-semibold text-red-700">Missing</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
