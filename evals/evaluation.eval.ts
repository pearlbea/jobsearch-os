import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  cleanJobDescription,
  runEvaluation,
} from "@/lib/evaluation-engine";
import { SCORE_DIMENSIONS } from "@/lib/score-dimensions";

// Real-model evals for runEvaluation: fixed resume/job pairs, each run
// EVAL_RUNS times, checked for properties that should hold regardless of the
// exact numbers (stability, ordering, keyword detection, dimension
// independence). Run with `npm run eval`; costs ~EVAL_RUNS x 4 Claude calls.

const RUNS = Number(process.env.EVAL_RUNS ?? 5);

// Max spread (max - min) across runs before we call a score unstable.
const MAX_SCORE_SPREAD = 10;
const MAX_DIMENSION_SPREAD = 15;
// Share of runs that must flag the planted missing keyword.
const MIN_KEYWORD_RECALL = 0.8;

const FIXTURES = path.join(__dirname, "fixtures");
const fixture = (name: string) =>
  readFileSync(path.join(FIXTURES, name), "utf8");

const RESUME = fixture("resume-senior-frontend.txt");
const CANDIDATE_NAME = "Jordan Rivera";

// Skills the resume states verbatim, so none should be reported missing.
const RESUME_KEYWORDS = [
  "React",
  "TypeScript",
  "Next.js",
  "GraphQL",
  "Jest",
  "Playwright",
];

const CASES = {
  strong: "job-strong-match.txt",
  weak: "job-weak-match.txt",
  plantedKeyword: "job-planted-keyword.txt",
  scopeMismatch: "job-scope-mismatch.txt",
} as const;

type CaseName = keyof typeof CASES;
type DimensionKey = keyof typeof SCORE_DIMENSIONS;
type EvalResult = Awaited<ReturnType<typeof runEvaluation>>["evalResult"];

const results = {} as Record<CaseName, EvalResult[]>;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
const scores = (name: CaseName) => results[name].map((r) => r.score);
const dimension = (name: CaseName, key: DimensionKey) =>
  results[name].map((r) => r.breakdown[key]);

const normalize = (s: string) => s.trim().toLowerCase();

async function evaluateRepeatedly(jobFile: string): Promise<EvalResult[]> {
  const cleanedDescription = cleanJobDescription(fixture(jobFile));
  return Promise.all(
    Array.from({ length: RUNS }, async () => {
      const { evalResult } = await runEvaluation({
        profile: { full_name: CANDIDATE_NAME, resume: RESUME },
        stories: null,
        cleanedDescription,
      });
      return evalResult;
    }),
  );
}

beforeAll(async () => {
  // Cases run one after another (runs within a case are parallel) to stay
  // well under API rate limits.
  for (const [name, file] of Object.entries(CASES) as [CaseName, string][]) {
    results[name] = await evaluateRepeatedly(file);
  }

  const dimensionKeys = Object.keys(SCORE_DIMENSIONS) as DimensionKey[];
  const summary = Object.fromEntries(
    (Object.keys(CASES) as CaseName[]).map((name) => [
      name,
      {
        scores: scores(name).join(" "),
        median: median(scores(name)),
        spread: spread(scores(name)),
        ...Object.fromEntries(
          dimensionKeys.map((key) => [
            `${key} (med/spread)`,
            `${median(dimension(name, key))}/${spread(dimension(name, key))}`,
          ]),
        ),
        // e.g. "senior→director ×5": which levels the scope score rests on
        levels: tally(
          results[name].map((r) => `${r.level.candidate}→${r.level.role}`),
        ),
      },
    ]),
  );
  console.table(summary);

  // On GitHub Actions, also show the table on the run's summary page.
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, toMarkdown(summary));
  }
});

function tally(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].map(([v, n]) => `${v} ×${n}`).join(", ");
}

function toMarkdown(rows: Record<string, Record<string, unknown>>): string {
  const columns = Object.keys(Object.values(rows)[0]);
  const line = (cells: unknown[]) => `| ${cells.join(" | ")} |`;
  return [
    `### Eval results (${RUNS} runs per case)`,
    "",
    line(["case", ...columns]),
    line(["---", ...columns.map(() => "---")]),
    ...Object.entries(rows).map(([name, row]) =>
      line([name, ...columns.map((c) => row[c])]),
    ),
    "",
  ].join("\n");
}

describe("stability across repeated runs", () => {
  it.each(Object.keys(CASES) as CaseName[])(
    "%s: match score spread stays small",
    (name) => {
      expect(spread(scores(name))).toBeLessThanOrEqual(MAX_SCORE_SPREAD);
    },
  );

  it.each(
    (Object.keys(CASES) as CaseName[]).flatMap((name) =>
      (Object.keys(SCORE_DIMENSIONS) as DimensionKey[]).map(
        (key) => [name, key] as const,
      ),
    ),
  )("%s: %s spread stays small", (name, key) => {
    expect(spread(dimension(name, key))).toBeLessThanOrEqual(
      MAX_DIMENSION_SPREAD,
    );
  });
});

describe("score calibration", () => {
  it("rates a close match as a solid fit", () => {
    expect(median(scores("strong"))).toBeGreaterThanOrEqual(75);
  });

  it("rates an unrelated role as a poor fit", () => {
    expect(median(scores("weak"))).toBeLessThan(50);
  });

  it("ranks the close match well above the unrelated role", () => {
    expect(
      median(scores("strong")) - median(scores("weak")),
    ).toBeGreaterThanOrEqual(25);
  });
});

describe("dimension independence", () => {
  // Director role in the same stack and domain: tech and domain should stay
  // high while scope drops, not all three moving together.
  it("scores scope well below tech for a level mismatch", () => {
    const tech = median(dimension("scopeMismatch", "tech"));
    const scope = median(dimension("scopeMismatch", "scope"));
    expect(tech).toBeGreaterThanOrEqual(70);
    expect(tech - scope).toBeGreaterThanOrEqual(20);
  });

  // Senior IC to senior IC in an unrelated field: scope measures only level
  // and responsibility, so it should stay high while tech and domain bottom out.
  it("keeps scope high for a same-level role in another field", () => {
    expect(median(dimension("weak", "scope"))).toBeGreaterThanOrEqual(75);
  });
});

describe("keyword scan", () => {
  it("flags a required keyword the resume lacks", () => {
    const flagged = results.plantedKeyword.filter((r) =>
      r.ats_analysis.missing_exact_keywords.some((kw) =>
        normalize(kw).includes("terraform"),
      ),
    );
    expect(flagged.length / RUNS).toBeGreaterThanOrEqual(MIN_KEYWORD_RECALL);
  });

  it.each(["strong", "plantedKeyword", "scopeMismatch"] as CaseName[])(
    "%s: doesn't report skills the resume states as missing",
    (name) => {
      const falsePositives = results[name]
        .flatMap((r) => r.ats_analysis.missing_exact_keywords)
        .filter((kw) =>
          RESUME_KEYWORDS.some((present) => normalize(kw) === normalize(present)),
        );
      expect(falsePositives).toEqual([]);
    },
  );
});
