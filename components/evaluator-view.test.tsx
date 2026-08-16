import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { EvaluatorView } from "./evaluator-view";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

let mockSupabase: MockSupabaseClient;
let searchParamValue: string | null = null;
const mockPush = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "job" ? searchParamValue : null),
  }),
}));

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

const mockJob = {
  id: "job-1",
  user_id: "user-1",
  company_name: "Acme Corp",
  role_title: "Engineering Manager",
  location: "Remote",
  job_url: null,
  raw_description: "We are looking for a manager...",
  status: "bookmarked",
  match_score: 82,
  evaluation_summary: mockEvaluationSummary,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
};

const mockEvaluation = {
  id: "eval-1",
  job_id: "job-1",
  user_id: "user-1",
  match_score: 82,
  evaluation_summary: mockEvaluationSummary,
  resume_snapshot: "Software engineer...",
  created_at: "2026-08-01T00:00:00Z",
};

describe("EvaluatorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamValue = null;
    mockSupabase = createMockSupabaseClient();
  });

  it("shows the empty state and hides the saved-evaluations sidebar when there are no saved evaluations", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    render(<EvaluatorView />);

    await waitFor(() => {
      expect(
        screen.getByText(/submit a job posting above/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/saved evaluations/i)).not.toBeInTheDocument();
    expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
  });

  it("loads the job referenced by the job search param via the API", async () => {
    searchParamValue = "job-1";
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

    render(<EvaluatorView />);

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith("/api/jobs/job-1");
  });

  it("shows a not-found message when the requested job can't be loaded", async () => {
    searchParamValue = "missing-job";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Job evaluation not found" }),
        } as Response),
      ),
    );

    render(<EvaluatorView />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't be found/i)).toBeInTheDocument();
    });
  });

  it("shows saved evaluations in the sidebar and navigates when one is selected", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "job-1",
            role_title: "Engineering Manager",
            company_name: "Acme Corp",
            match_score: 85,
            created_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      }),
    }));

    const user = userEvent.setup();
    render(<EvaluatorView />);

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Engineering Manager"));

    expect(mockPush).toHaveBeenCalledWith("/evaluator?job=job-1");
  });

  it("has no detectable accessibility violations", async () => {
    searchParamValue = "job-1";
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
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "job-1",
            role_title: "Engineering Manager",
            company_name: "Acme Corp",
            match_score: 82,
            created_at: "2026-08-01T00:00:00Z",
          },
        ],
        error: null,
      }),
    }));

    const { container } = render(<EvaluatorView />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Engineering Manager" }),
      ).toBeInTheDocument();
    });

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
