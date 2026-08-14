import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { EvaluationCard } from "./evaluation-card";
import type { EvaluationSummary, Job } from "@/types/database";

const baseEvaluation: EvaluationSummary = {
  match_score: 82,
  score_breakdown: {
    technical_match: 90,
    domain_match: 75,
    leadership_match: 80,
  },
  key_strengths: ["Led a platform migration", "Deep TypeScript experience"],
  potential_gaps: ["Limited experience with regulated industries"],
  positioning_advice: "Emphasize your platform leadership track record.",
  parsed_requirements: {
    required_skills: ["TypeScript", "React"],
    preferred_skills: ["Next.js"],
    is_remote: true,
    salary_range: "$150k - $180k",
  },
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
  evaluation_summary: baseEvaluation,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
};

describe("EvaluationCard Component", () => {
  it("shows a fallback message when there is no evaluation summary", () => {
    render(<EvaluationCard job={{ ...baseJob, evaluation_summary: null }} />);

    expect(
      screen.getByText(/no evaluation summary available/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Engineering Manager")).not.toBeInTheDocument();
  });

  it("displays the role, company, location, and overall match score", () => {
    render(<EvaluationCard job={baseJob} />);

    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText(/Remote \(US\)/)).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("falls back to a placeholder when location is missing", () => {
    render(<EvaluationCard job={{ ...baseJob, location: null }} />);

    expect(screen.getByText(/location not specified/i)).toBeInTheDocument();
  });

  it("shows a Remote badge only when the role is remote", () => {
    const { rerender } = render(<EvaluationCard job={baseJob} />);
    expect(screen.getByText("Remote")).toBeInTheDocument();

    rerender(
      <EvaluationCard
        job={{
          ...baseJob,
          evaluation_summary: {
            ...baseEvaluation,
            parsed_requirements: {
              ...baseEvaluation.parsed_requirements,
              is_remote: false,
            },
          },
        }}
      />,
    );
    expect(screen.queryByText("Remote")).not.toBeInTheDocument();
  });

  it("shows a salary badge only when a salary range is provided", () => {
    const { rerender } = render(<EvaluationCard job={baseJob} />);
    expect(screen.getByText(/\$150k - \$180k/)).toBeInTheDocument();

    rerender(
      <EvaluationCard
        job={{
          ...baseJob,
          evaluation_summary: {
            ...baseEvaluation,
            parsed_requirements: {
              ...baseEvaluation.parsed_requirements,
              salary_range: undefined,
            },
          },
        }}
      />,
    );
    expect(screen.queryByText(/\$150k - \$180k/)).not.toBeInTheDocument();
  });

  it("lists key strengths and potential gaps", () => {
    render(<EvaluationCard job={baseJob} />);

    expect(
      screen.getByText("Led a platform migration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Deep TypeScript experience"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Limited experience with regulated industries"),
    ).toBeInTheDocument();
  });

  it("shows the positioning advice", () => {
    render(<EvaluationCard job={baseJob} />);

    expect(
      screen.getByText(/emphasize your platform leadership track record/i),
    ).toBeInTheDocument();
  });

  it("renders the ATS filter simulation only when ats_analysis is present", () => {
    const { rerender } = render(<EvaluationCard job={baseJob} />);
    expect(screen.queryByText(/ATS Filter Simulation/i)).not.toBeInTheDocument();

    rerender(
      <EvaluationCard
        job={{
          ...baseJob,
          evaluation_summary: {
            ...baseEvaluation,
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

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <EvaluationCard
        job={{
          ...baseJob,
          evaluation_summary: {
            ...baseEvaluation,
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
