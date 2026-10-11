export interface RawTalkingPoint {
  say: string;
  basis: string;
}

export type DropReason = "number_in_say" | "number_in_basis";

export interface DroppedTalkingPoint {
  point: RawTalkingPoint;
  reason: DropReason;
  number: string;
}

// Numbers with an optional magnitude word/suffix, e.g. "40%", "$2M", "15k",
// "40 percent", "1,200", "1.5 million". Digits glued to a letter ("S3",
// "Web3", "OAuth2", "Q3") are names, not figures, and are skipped. Commas
// count only as thousands separators, so "3,4" is two numbers.
const NUMBER_RE =
  /(?<![A-Za-z\d])\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s*(percent|million|thousand)\b|\s*%|([km])\b)?/gi;

const MAGNITUDES: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  million: 1e6,
};

// Reduces a figure to its numeric value so "1.5M", "1,500,000" and
// "$1.5 million" compare equal. A percent sign is deliberately ignored: a
// point saying "40" for a resume's "40%" (or the reverse) is not a fabrication.
function extractNumbers(text: string): string[] {
  return [...text.matchAll(NUMBER_RE)].map(
    ([, int, frac = "", word, suffix]) => {
      const multiplier = MAGNITUDES[(word ?? suffix ?? "").toLowerCase()] ?? 1;
      return String(Number(int.replace(/,/g, "") + frac) * multiplier);
    },
  );
}

/**
 * Drops talking points containing a number that the resume does not contain.
 * Checks the resume only, never the job posting, so a figure from the posting
 * can't pass as the candidate's own.
 */
export function validateTalkingPoints(
  points: RawTalkingPoint[],
  resume: string | null,
): { kept: RawTalkingPoint[]; dropped: DroppedTalkingPoint[] } {
  const resumeNumbers = new Set(extractNumbers(resume ?? ""));
  const kept: RawTalkingPoint[] = [];
  const dropped: DroppedTalkingPoint[] = [];

  for (const point of points) {
    const missingInSay = extractNumbers(point.say).find(
      (n) => !resumeNumbers.has(n),
    );
    const missingInBasis = extractNumbers(point.basis).find(
      (n) => !resumeNumbers.has(n),
    );
    if (missingInSay) {
      dropped.push({ point, reason: "number_in_say", number: missingInSay });
    } else if (missingInBasis) {
      dropped.push({
        point,
        reason: "number_in_basis",
        number: missingInBasis,
      });
    } else {
      kept.push(point);
    }
  }

  return { kept, dropped };
}
