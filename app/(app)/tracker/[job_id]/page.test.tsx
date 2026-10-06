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
import { makeEvaluation, makeInteraction, makeJob } from "@/test/fixtures";

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

const interaction = makeInteraction({
  user_id: "user-123",
  kind: "hiring_manager",
  created_at: "2026-09-02T00:00:00Z",
});

const evaluation = makeEvaluation({ user_id: "user-123" });

const props = (job_id = "job-1") =>
  ({ params: Promise.resolve({ job_id }) }) as PageProps<"/tracker/[job_id]">;

describe("JobPage", () => {
  let mockSupabase: MockSupabaseClient;
  let jobsQuery: ReturnType<typeof createMockQueryBuilder>;
  let evaluationsQuery: ReturnType<typeof createMockQueryBuilder>;
  let interactionsQuery: ReturnType<typeof createMockQueryBuilder>;
  let profilesQuery: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // The page queries four tables in parallel, so each needs its own chain.
    jobsQuery = createMockQueryBuilder({
      single: vi.fn().mockResolvedValue({ data: job, error: null }),
    });
    evaluationsQuery = createMockQueryBuilder({
      order: vi.fn().mockResolvedValue({ data: [evaluation], error: null }),
    });
    interactionsQuery = createMockQueryBuilder({
      order: vi.fn().mockResolvedValue({ data: [interaction], error: null }),
    });
    profilesQuery = createMockQueryBuilder({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { resume: "Profile resume." },
        error: null,
      }),
    });
    const queries: Record<string, ReturnType<typeof createMockQueryBuilder>> = {
      jobs: jobsQuery,
      evaluations: evaluationsQuery,
      interactions: interactionsQuery,
      profiles: profilesQuery,
    };
    mockSupabase.from.mockImplementation((table: string) => queries[table]);
  });

  it("renders the job form and its interactions", async () => {
    render(await JobPage(props()));

    expect(
      screen.getByRole("heading", { name: "Staff Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("interviewing");
    expect(
      screen.getByRole("heading", { name: "Conversations & Interviews" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hiring Manager")).toBeInTheDocument();
  });

  it("links back to the tracker list", async () => {
    render(await JobPage(props()));

    expect(
      screen.getByRole("link", { name: "Back to Job Tracker" }),
    ).toHaveAttribute("href", "/tracker");
  });

  it("shows the job's evaluation with the option to re-evaluate", async () => {
    render(await JobPage(props()));

    expect(screen.getByRole("heading", { name: "Evaluation" })).toBeInTheDocument();
    expect(screen.getByText("Good fit")).toBeInTheDocument();
    expect(screen.getByText("Lead with platform work.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-evaluate" })).toBeEnabled();
    // The profile has a resume, so it's offered as the default.
    expect(screen.getByLabelText(/My profile resume/)).toBeChecked();
  });

  it("offers to evaluate a job that hasn't been evaluated yet", async () => {
    evaluationsQuery.order.mockResolvedValue({ data: [], error: null });

    render(await JobPage(props()));

    expect(screen.getByRole("button", { name: "Evaluate" })).toBeEnabled();
    expect(screen.queryByText("Good fit")).not.toBeInTheDocument();
  });

  it("asks for a resume when the user has no profile row yet", async () => {
    evaluationsQuery.order.mockResolvedValue({ data: [], error: null });
    profilesQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    render(await JobPage(props()));

    expect(screen.getByLabelText("Your Resume")).toBeInTheDocument();
    expect(screen.queryByLabelText(/My profile resume/)).not.toBeInTheDocument();
  });

  it("scopes the evaluations and profile queries to the job and user", async () => {
    await JobPage(props());

    expect(evaluationsQuery.eq).toHaveBeenCalledWith("job_id", "job-1");
    expect(evaluationsQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(evaluationsQuery.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(profilesQuery.eq).toHaveBeenCalledWith("id", "user-123");
  });

  it.each(["evaluations", "profiles"])(
    "throws when loading %s fails",
    async (table) => {
      const failure = { data: null, error: new Error(`${table} failed`) };
      if (table === "evaluations") evaluationsQuery.order.mockResolvedValue(failure);
      else profilesQuery.maybeSingle.mockResolvedValue(failure);

      await expect(JobPage(props())).rejects.toThrow(`${table} failed`);
    },
  );

  it("scopes both queries to the requested job and the logged-in user", async () => {
    await JobPage(props());

    expect(jobsQuery.eq).toHaveBeenCalledWith("id", "job-1");
    expect(jobsQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(interactionsQuery.eq).toHaveBeenCalledWith("job_id", "job-1");
    expect(interactionsQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(interactionsQuery.order).toHaveBeenCalledWith("occurred_at", {
      ascending: false,
      nullsFirst: true,
    });
  });

  it("shows the empty state when the job has no interactions", async () => {
    interactionsQuery.order.mockResolvedValue({ data: null, error: null });

    render(await JobPage(props()));

    expect(
      screen.getByText("No conversations or interviews yet."),
    ).toBeInTheDocument();
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

  it("throws when loading interactions fails", async () => {
    interactionsQuery.order.mockResolvedValue({
      data: null,
      error: new Error("relation does not exist"),
    });

    await expect(JobPage(props())).rejects.toThrow("relation does not exist");
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
