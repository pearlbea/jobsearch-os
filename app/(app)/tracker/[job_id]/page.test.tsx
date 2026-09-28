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
import { Interaction, Job } from "@/types/database";

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

const job: Job = {
  id: "job-1",
  user_id: "user-123",
  company_name: "Acme",
  role_title: "Staff Engineer",
  location: null,
  job_url: null,
  raw_description: "Build things.",
  status: "interviewing",
  application_date: null,
  contact_person: null,
  salary_range: null,
  recruiter_initiated: false,
  next_action: null,
  next_action_date: null,
  source: null,
  referral_name: null,
  notes: null,
  closed_reason: null,
  work_mode: null,
  match_score: 82,
  evaluation_summary: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: null,
};

const interaction: Interaction = {
  id: "int-1",
  job_id: "job-1",
  user_id: "user-123",
  kind: "hiring_manager",
  occurred_at: null,
  interviewer_names: null,
  outcome: null,
  notes: null,
  story_ids: null,
  created_at: "2026-09-02T00:00:00Z",
  updated_at: null,
};

const props = (job_id = "job-1") =>
  ({ params: Promise.resolve({ job_id }) }) as PageProps<"/tracker/[job_id]">;

describe("JobPage", () => {
  let mockSupabase: MockSupabaseClient;
  let jobsQuery: ReturnType<typeof createMockQueryBuilder>;
  let interactionsQuery: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // The page queries both tables in parallel, so each needs its own chain.
    jobsQuery = createMockQueryBuilder({
      single: vi.fn().mockResolvedValue({ data: job, error: null }),
    });
    interactionsQuery = createMockQueryBuilder({
      order: vi.fn().mockResolvedValue({ data: [interaction], error: null }),
    });
    mockSupabase.from.mockImplementation((table: string) =>
      table === "jobs" ? jobsQuery : interactionsQuery,
    );
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
