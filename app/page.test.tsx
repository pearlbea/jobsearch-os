import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";
import { createClient } from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Home page", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    (createClient as Mock).mockResolvedValue(mockSupabase);
  });

  it("shows a sign-in CTA and never queries profiles when logged out", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const page = await Home();
    render(page);

    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("prompts to create a profile when logged in with no profile row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "pearl@example.com" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({ data: null, error: null });

    const page = await Home();
    render(page);

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "user-123");
    expect(
      screen.getByRole("button", { name: "Create your profile" }),
    ).toHaveAttribute("href", "/profile");
    expect(
      screen.getByRole("link", { name: "Skip to the evaluator" }),
    ).toHaveAttribute("href", "/evaluator");
  });

  it("shows the profile/evaluator dashboard when logged in with a profile", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "pearl@example.com" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "user-123", full_name: "Jane Doe" },
      error: null,
    });

    const page = await Home();
    render(page);

    expect(screen.getByText("Welcome back, Jane Doe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("link", { name: /Job Evaluator/ })).toHaveAttribute(
      "href",
      "/evaluator",
    );
  });
});
