import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import JobPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
  type MockSupabaseClient,
} from "@/test/supabase-mock";
import { makeJob } from "@/test/fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
// The page's child components use the browser client; they don't query on render.
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const job = makeJob({
  user_id: "user-123",
  company_name: "Acme",
  role_title: "Staff Engineer",
  raw_description: "Build things.",
  status: "interviewing",
  match_score: 82,
  created_at: "2026-09-01T00:00:00Z",
});

const props = (job_id = "job-1") =>
  ({ params: Promise.resolve({ job_id }) }) as PageProps<"/tracker/[job_id]">;

describe("JobPage", () => {
  let mockSupabase: MockSupabaseClient;
  let jobsQuery: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    jobsQuery = createMockQueryBuilder({
      single: vi.fn().mockResolvedValue({ data: job, error: null }),
    });
    const queries: Record<string, ReturnType<typeof createMockQueryBuilder>> = {
      jobs: jobsQuery,
    };
    mockSupabase.from.mockImplementation((table: string) => queries[table]);
  });

  it("renders the job form", async () => {
    render(await JobPage(props()));

    expect(
      screen.getByRole("heading", { name: "Staff Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("interviewing");
  });

  it("doesn't render or query the evaluation or interactions", async () => {
    render(await JobPage(props()));

    expect(
      screen.queryByRole("heading", { name: "Evaluation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Conversations & Interviews" }),
    ).not.toBeInTheDocument();
    expect(mockSupabase.from).not.toHaveBeenCalledWith("evaluations");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("interactions");
    expect(mockSupabase.from).not.toHaveBeenCalledWith("profiles");
  });

  it("404s when the job doesn't exist or belongs to another user", async () => {
    jobsQuery.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows found" },
    });

    await expect(JobPage(props("someone-elses-job"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("404s when the job id isn't a valid UUID", async () => {
    jobsQuery.single.mockResolvedValue({
      data: null,
      error: { code: "22P02", message: "invalid input syntax for type uuid" },
    });

    await expect(JobPage(props("not-a-uuid"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("throws, rather than 404ing, when loading the job fails", async () => {
    const failure = Object.assign(new Error("column jobs.work_mode does not exist"), {
      code: "42703",
    });
    jobsQuery.single.mockResolvedValue({ data: null, error: failure });

    await expect(JobPage(props())).rejects.toThrow(
      "column jobs.work_mode does not exist",
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("redirects to login when not signed in", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(JobPage(props())).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
