import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((o) => o) },
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "model") }));

import { generateText } from "ai";
import { runEvaluation } from "./evaluation-engine";

const base = {
  co: "Acme",
  title: "EM",
  remote: true,
  level: { candidate: "senior", role: "senior" },
  breakdown: { tech: 80, domain: 80, scope: 80 },
  ats_analysis: { missing_exact_keywords: [], formatting_warnings: [] },
  strengths: [],
  gaps: [],
  advice: "",
  skills: [],
};

async function run(points: { say: string; basis: string }[]) {
  (generateText as Mock).mockResolvedValue({ output: { ...base, points } });
  return runEvaluation({
    profile: { full_name: null, resume: "Cut latency 40% at Acme." },
    stories: null,
    cleanedDescription: "job",
  });
}

describe("runEvaluation talking points", () => {
  it("maps points to talking_points", async () => {
    const { fullEvaluationSummary } = await run([
      { say: "I cut latency 40%.", basis: "Acme" },
    ]);
    expect(fullEvaluationSummary.talking_points).toEqual([
      { point: "I cut latency 40%.", evidence: "Acme" },
    ]);
  });

  it("excludes dropped points and reports the count", async () => {
    const r = await run([
      { say: "I cut latency 40%.", basis: "Acme" },
      { say: "I managed 12 engineers.", basis: "Acme" },
    ]);
    expect(r.fullEvaluationSummary.talking_points).toHaveLength(1);
    expect(r.droppedTalkingPointCount).toBe(1);
  });

  it("omits talking_points when all are dropped or none returned", async () => {
    const dropped = await run([
      { say: "I managed 12 engineers.", basis: "Acme" },
    ]);
    expect(dropped.fullEvaluationSummary.talking_points).toBeUndefined();
    expect(dropped.evalResult.score).toBe(80);
    const empty = await run([]);
    expect(empty.fullEvaluationSummary.talking_points).toBeUndefined();
  });
});
