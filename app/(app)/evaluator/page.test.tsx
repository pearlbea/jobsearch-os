import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import EvaluatorPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EvaluatorView } from "@/components/evaluator-view";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

// Mock Supabase Server Client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Next.js Navigation. Real Next.js `redirect()` always throws (a
// special NEXT_REDIRECT error) to interrupt rendering — a no-op mock would
// let the component keep executing past the redirect call.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// Mock the client EvaluatorView component
vi.mock("@/components/evaluator-view", () => ({
  EvaluatorView: vi.fn(() => <div data-testid="evaluator-view" />),
}));

describe("EvaluatorPage Server Component", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    (createClient as Mock).mockResolvedValue(mockSupabase);
  });

  it("redirects to /login if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth required"),
    });

    await expect(EvaluatorPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders EvaluatorView for authenticated users", async () => {
    const mockUser = { id: "user-123", email: "pearl@example.com" };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const pageComponent = await EvaluatorPage();
    render(pageComponent);

    expect(screen.getByTestId("evaluator-view")).toBeInTheDocument();
  });

  it("passes the user's job summaries to EvaluatorView", async () => {
    const jobSummaries = [
      {
        id: "job-1",
        role_title: "Engineering Manager",
        company_name: "Acme Corp",
        match_score: 82,
        created_at: "2026-08-01T00:00:00Z",
      },
    ];
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.order.mockResolvedValue({ data: jobSummaries, error: null });

    render(await EvaluatorPage());

    expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
    expect(vi.mocked(EvaluatorView).mock.calls[0][0]).toEqual({
      initialJobSummaries: jobSummaries,
    });
  });

  it("falls back to an empty list when the jobs query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.order.mockResolvedValue({
      data: null,
      error: new Error("DB down"),
    });

    render(await EvaluatorPage());

    expect(vi.mocked(EvaluatorView).mock.calls[0][0]).toEqual({
      initialJobSummaries: [],
    });
  });
});
