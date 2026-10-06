import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { EvaluationCard } from "./evaluation-card";
import type { EvaluationSummary, Evaluation } from "@/types/database";
import { makeJob } from "@/test/fixtures";

const baseEvaluationSummary: EvaluationSummary = {
  match_score: 82,
  score_breakdown: {
    technical_match: 90,
    domain_match: 75,
    leadership_match: 80,
  },
  key_strengths: ["Led a platform migration", "Deep TypeScript experience"],
  potential_gaps: ["Limited experience with regulated industries"],
  positioning_advice: "Emphasize your platform leadership track record.",
};

const baseEvaluation: Evaluation = {
  id: "eval-1",
  job_id: "job-1",
  user_id: "user-1",
  match_score: 82,
  evaluation_summary: baseEvaluationSummary,
  resume_snapshot: "Software engineer...",
  created_at: "2026-08-01T00:00:00Z",
};

const baseJob = makeJob({
  location: "Remote (US)",
  job_url: "https://acme.example.com/careers/em",
  match_score: 82,
  evaluation_summary: baseEvaluationSummary,
});

describe("EvaluationCard Component", () => {
  it("displays the role, company, location, and overall fit", () => {
    render(<EvaluationCard job={baseJob} evaluation={baseEvaluation} />);

    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Good fit")).toBeInTheDocument();
  });

  it("lists key strengths and potential gaps", () => {
    render(<EvaluationCard job={baseJob} evaluation={baseEvaluation} />);

    expect(screen.getByText("Led a platform migration")).toBeInTheDocument();
    expect(screen.getByText("Deep TypeScript experience")).toBeInTheDocument();
    expect(
      screen.getByText("Limited experience with regulated industries"),
    ).toBeInTheDocument();
  });

  it("shows the positioning advice", () => {
    render(<EvaluationCard job={baseJob} evaluation={baseEvaluation} />);

    expect(
      screen.getByText(/emphasize your platform leadership track record/i),
    ).toBeInTheDocument();
  });

  it("renders the keyword match only when ats_analysis is present", () => {
    const { rerender } = render(
      <EvaluationCard job={baseJob} evaluation={baseEvaluation} />,
    );
    expect(
      screen.queryByRole("heading", { name: "Keyword match" }),
    ).not.toBeInTheDocument();

    rerender(
      <EvaluationCard
        job={baseJob}
        evaluation={{
          ...baseEvaluation,
          evaluation_summary: {
            ...baseEvaluationSummary,
            ats_analysis: {
              missing_exact_keywords: ["Kubernetes", "GraphQL"],
              formatting_warnings: [],
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Keyword match" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pass rate/i)).not.toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("says so when no posting keywords are missing", () => {
    render(
      <EvaluationCard
        job={baseJob}
        evaluation={{
          ...baseEvaluation,
          evaluation_summary: {
            ...baseEvaluationSummary,
            ats_analysis: { missing_exact_keywords: [], formatting_warnings: [] },
          },
        }}
      />,
    );

    expect(
      screen.getByText("Every key term in the posting appears in your resume."),
    ).toBeInTheDocument();
  });

  it("shows a re-evaluate button only when onReevaluate is provided, and reflects the loading state", () => {
    const { rerender } = render(
      <EvaluationCard job={baseJob} evaluation={baseEvaluation} />,
    );
    expect(
      screen.queryByRole("button", { name: /re-evaluate/i }),
    ).not.toBeInTheDocument();

    const onReevaluate = vi.fn();
    rerender(
      <EvaluationCard
        job={baseJob}
        evaluation={baseEvaluation}
        onReevaluate={onReevaluate}
      />,
    );
    expect(
      screen.getByRole("button", { name: /re-evaluate with updated resume/i }),
    ).toBeEnabled();

    rerender(
      <EvaluationCard
        job={baseJob}
        evaluation={baseEvaluation}
        onReevaluate={onReevaluate}
        isReevaluating
      />,
    );
    expect(
      screen.getByRole("button", { name: /re-evaluating/i }),
    ).toBeDisabled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <EvaluationCard
        job={baseJob}
        evaluation={{
          ...baseEvaluation,
          evaluation_summary: {
            ...baseEvaluationSummary,
            ats_analysis: {
              missing_exact_keywords: ["Kubernetes"],
              formatting_warnings: [],
            },
          },
        }}
      />,
    );

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
