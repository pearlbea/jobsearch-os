import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import TrackerPage from "./page";
import { createClient } from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from "@/test/supabase-mock";
import { makeJob } from "@/test/fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("TrackerPage", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as Mock).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    // The jobs query ends in .order(), which resolves it.
    mockSupabase.order.mockResolvedValue({ data: [], error: null });
  });

  it("renders the heading, an Add New Job link, and an empty state", async () => {
    render(await TrackerPage());
    expect(
      screen.getByRole("heading", { name: "Job Tracker" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add New Job" })).toHaveAttribute(
      "href",
      "/tracker/new",
    );
    expect(screen.getByText(/No jobs yet/)).toBeInTheDocument();
  });

  it("lists the user's jobs, newest first, each linking to its tracker page", async () => {
    mockSupabase.order.mockResolvedValue({
      data: [
        makeJob({ id: "job-2", role_title: "Staff Engineer", status: "applied" }),
        makeJob({ id: "job-1", role_title: "Engineering Manager" }),
      ],
      error: null,
    });

    render(await TrackerPage());

    expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(["/tracker/job-2", "/tracker/job-1"]);
    expect(screen.queryByText(/No jobs yet/)).not.toBeInTheDocument();
    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("shows an error message when loading jobs fails", async () => {
    mockSupabase.order.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });

    render(await TrackerPage());

    expect(
      screen.getByText("Error loading job summaries: connection refused"),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /Engineering Manager/ })).toHaveLength(0);
  });
});
