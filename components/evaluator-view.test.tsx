import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("EvaluatorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamValue = null;
    mockSupabase = createMockSupabaseClient();
  });

  it("shows the empty state and never queries Supabase when no job param is present", async () => {
    render(<EvaluatorView />);

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
    expect(mockSupabase.from).not.toHaveBeenCalled();
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

  it("opens the history modal when the History button is clicked", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const user = userEvent.setup();
    render(<EvaluatorView />);

    expect(
      screen.queryByRole("heading", { name: "History" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "History" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    });
  });

  it("navigates to the selected evaluation and closes the modal", async () => {
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

    await user.click(screen.getByRole("button", { name: "History" }));
    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Engineering Manager"));

    expect(mockPush).toHaveBeenCalledWith("/evaluator?job=job-1");
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "History" }),
      ).not.toBeInTheDocument();
    });
  });
});
