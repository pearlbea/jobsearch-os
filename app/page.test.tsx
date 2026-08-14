import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import Home from "./page";
import { createClient } from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// The "welcome back" state renders RailShell, a client component that reads
// the route and creates a browser Supabase client — neither is available in
// this render environment, so stub them like rail-shell.test.tsx does.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/client", () => ({
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

    // Both the header and the hero have their own "Sign in" CTA.
    const signInButtons = screen.getAllByRole("button", { name: "Sign in" });
    expect(signInButtons.length).toBeGreaterThan(0);
    for (const button of signInButtons) {
      expect(button).toHaveAttribute("href", "/login");
    }
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

    // Scope to the dashboard content, since the rail nav has its own
    // "Profile" / "Evaluate" links with overlapping accessible names.
    const main = within(screen.getByRole("main"));

    expect(screen.getByText("Welcome back, Jane Doe.")).toBeInTheDocument();
    expect(main.getByRole("link", { name: /Profile/ })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(main.getByRole("link", { name: /Job Evaluator/ })).toHaveAttribute(
      "href",
      "/evaluator",
    );
  });

  it("has no detectable accessibility violations", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "pearl@example.com" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "user-123", full_name: "Jane Doe" },
      error: null,
    });

    const page = await Home();
    const { container } = render(page);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
