import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { EvaluationCard } from "./evaluation-card";
import type { EvaluationSummary, Job, Evaluation } from "@/types/database";

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

const baseJob: Job = {
  id: "job-1",
  user_id: "user-1",
  company_name: "Acme Corp",
  role_title: "Engineering Manager",
  location: "Remote (US)",
  job_url: "https://acme.example.com/careers/em",
  raw_description: "We are looking for...",
  status: "bookmarked",
  match_score: 82,
  evaluation_summary: baseEvaluationSummary,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
};

describe("EvaluationCard Component", () => {
  it("displays the role, company, location, and overall match score", () => {
    render(<EvaluationCard job={baseJob} evaluation={baseEvaluation} />);

    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
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

  it("renders the ATS filter simulation only when ats_analysis is present", () => {
    const { rerender } = render(
      <EvaluationCard job={baseJob} evaluation={baseEvaluation} />,
    );
    expect(
      screen.queryByText(/ATS Filter Simulation/i),
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
              ats_pass_probability: "Medium",
            },
          },
        }}
      />,
    );

    expect(screen.getByText(/ATS Filter Simulation/i)).toBeInTheDocument();
    expect(screen.getByText("Medium ATS Pass Rate")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("GraphQL")).toBeInTheDocument();
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
      screen.getByRole("button", { name: /re-evaluate with current resume/i }),
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
              ats_pass_probability: "Low",
            },
          },
        }}
      />,
    );

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
