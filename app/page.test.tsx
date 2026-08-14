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

  it("shows a sign-in link and never queries profiles when logged out", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const page = await Home();
    render(page);

    expect(
      screen.getByRole("link", { name: "Already have a profile? Sign in" }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("button", { name: "Create your profile" }),
    ).toHaveAttribute("href", "/login?mode=sign-up");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("prompts to create a profile when logged in with no profile row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "pearl@example.com" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows found" },
    });

    const page = await Home();
    render(page);

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "user-123");
    expect(
      screen.getByRole("button", { name: "Create your profile" }),
    ).toHaveAttribute("href", "/profile");
    // Already signed in, so there's no reason to offer a sign-in link.
    expect(
      screen.queryByRole("link", { name: /Sign in/ }),
    ).not.toBeInTheDocument();
  });

  it("shows an error state instead of onboarding when the profile fetch fails unexpectedly", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "pearl@example.com" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "500", message: "connection reset" },
    });

    const page = await Home();
    render(page);

    expect(
      screen.getByText(/Something went wrong loading your profile/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create your profile" }),
    ).not.toBeInTheDocument();
  });

  it("treats a failed auth check as logged out", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid session" },
    });

    const page = await Home();
    render(page);

    expect(
      screen.getByRole("link", { name: "Already have a profile? Sign in" }),
    ).toBeInTheDocument();
    expect(mockSupabase.from).not.toHaveBeenCalled();
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
