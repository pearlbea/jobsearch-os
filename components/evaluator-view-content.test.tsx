import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { EvaluatorViewContent } from "./evaluator-view-content";
import type { JobSummary } from "@/types/database";
import { makeJob } from "@/test/fixtures";

vi.mock("@/components/job-evaluator-form", () => ({
  JobEvaluatorForm: () => <div data-testid="job-evaluator-form" />,
}));

const mockEvaluationSummary = {
  match_score: 82,
  score_breakdown: { technical_match: 90, domain_match: 75, leadership_match: 80 },
  key_strengths: ["Led a platform migration"],
  potential_gaps: ["Limited regulated-industry experience"],
  positioning_advice: "Emphasize your platform leadership track record.",
  parsed_requirements: {
    required_skills: ["TypeScript"],
    preferred_skills: [],
    is_remote: true,
  },
};

const mockJob = makeJob({
  location: "Remote",
  raw_description: "We are looking for a manager...",
  match_score: 82,
  evaluation_summary: mockEvaluationSummary,
});

const mockEvaluation = {
  id: "eval-1",
  job_id: "job-1",
  user_id: "user-1",
  match_score: 82,
  evaluation_summary: mockEvaluationSummary,
  resume_snapshot: "Software engineer...",
  created_at: "2026-08-01T00:00:00Z",
};

const mockJobSummaries: JobSummary[] = [
  {
    id: "job-1",
    role_title: "Engineering Manager",
    company_name: "Acme Corp",
    match_score: 82,
    created_at: "2026-08-01T00:00:00Z",
  },
];

describe("EvaluatorViewContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/evaluator");
  });

  it("shows the empty state and hides the saved-evaluations sidebar when there are no saved evaluations", () => {
    render(
      <EvaluatorViewContent
        jobId={null}
        showWelcome={false}
        jobSummaries={[]}
        setJobSummaries={vi.fn()}
      />,
    );

    expect(screen.getByText(/submit a job posting above/i)).toBeInTheDocument();
    expect(screen.queryByText(/saved evaluations/i)).not.toBeInTheDocument();
  });

  it("loads the job referenced by jobId via the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ job: mockJob, evaluations: [mockEvaluation] }),
        } as Response),
      ),
    );

    render(
      <EvaluatorViewContent
        jobId="job-1"
        showWelcome={false}
        jobSummaries={[]}
        setJobSummaries={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith("/api/jobs/job-1");
  });

  it("shows a not-found message when the requested job can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Job evaluation not found" }),
        } as Response),
      ),
    );

    render(
      <EvaluatorViewContent
        jobId="missing-job"
        showWelcome={false}
        jobSummaries={[]}
        setJobSummaries={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/couldn't be found/i)).toBeInTheDocument();
    });
  });

  it("shows saved evaluations in the sidebar and navigates when one is selected", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const user = userEvent.setup();
    render(
      <EvaluatorViewContent
        jobId={null}
        showWelcome={false}
        jobSummaries={mockJobSummaries}
        setJobSummaries={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Engineering Manager"));

    expect(pushState).toHaveBeenCalledWith(null, "", "/evaluator?job=job-1");
  });

  it("shows a welcome message when redirected from a first-time profile save and clears the param", () => {
    window.history.replaceState(null, "", "/evaluator?welcome=1");
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(
      <EvaluatorViewContent
        jobId={null}
        showWelcome={true}
        jobSummaries={[]}
        setJobSummaries={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/you're all set! paste in a job description below/i),
    ).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/evaluator");
  });

  it("has no detectable accessibility violations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ job: mockJob, evaluations: [mockEvaluation] }),
        } as Response),
      ),
    );

    const { container } = render(
      <EvaluatorViewContent
        jobId="job-1"
        showWelcome={false}
        jobSummaries={mockJobSummaries}
        setJobSummaries={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Engineering Manager" }),
      ).toBeInTheDocument();
    });

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
