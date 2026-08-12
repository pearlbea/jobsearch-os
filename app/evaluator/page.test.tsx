import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EvaluatorPage from "./page";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

let mockSupabase: MockSupabaseClient;
let searchParamValue: string | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "job" ? searchParamValue : null),
  }),
}));

vi.mock("@/components/job-evaluator-form", () => ({
  JobEvaluatorForm: ({ open }: { open: boolean }) => (
    <div data-testid="job-evaluator-form" data-open={open} />
  ),
}));

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
  evaluation_summary: {
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
  },
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
};

describe("EvaluatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamValue = null;
    mockSupabase = createMockSupabaseClient();
  });

  it("loads the most recently created job when no job param is present", async () => {
    mockSupabase.single.mockResolvedValue({ data: mockJob, error: null });

    render(<EvaluatorPage />);

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    // A result is showing, so the form collapses out of the way.
    expect(screen.getByTestId("job-evaluator-form")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("shows a friendly empty state when there are no saved evaluations", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error("no rows"),
    });

    render(<EvaluatorPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/submit a job posting above/i),
      ).toBeInTheDocument();
    });
    // Nothing to show, so the form stays open.
    expect(screen.getByTestId("job-evaluator-form")).toHaveAttribute(
      "data-open",
      "true",
    );
  });

  it("loads the job referenced by the job search param via the API", async () => {
    searchParamValue = "job-1";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: mockJob }),
        } as Response),
      ),
    );

    render(<EvaluatorPage />);

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

    render(<EvaluatorPage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't be found/i)).toBeInTheDocument();
    });
  });
});
