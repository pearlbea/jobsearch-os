import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RailShell } from "./rail-shell";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

const mockPush = vi.fn();
let mockPathname = "/evaluator";
let mockSupabase: MockSupabaseClient;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("RailShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/evaluator";
    mockSupabase = createMockSupabaseClient();
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
  });

  it("renders the wordmark, nav items, user email, and sign out", () => {
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    expect(
      screen.getAllByRole("link", { name: "JobSearch OS" })[0],
    ).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Evaluate" })[0]).toHaveAttribute(
      "href",
      "/evaluator",
    );
    expect(screen.getAllByRole("link", { name: "Profile" })[0]).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getAllByRole("button", { name: "History" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("pearl@example.com")[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sign out" })[0]).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("marks the Evaluate link active when its path matches", () => {
    mockPathname = "/evaluator";
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    const evaluateLinks = screen.getAllByRole("link", { name: "Evaluate" });
    expect(evaluateLinks[0].className).toMatch(/bg-zinc-900/);
  });

  it("opens the history modal when a History nav item is clicked", async () => {
    const user = userEvent.setup();
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    expect(screen.queryByRole("heading", { name: "History" })).not.toBeInTheDocument();

    const historyButtons = screen.getAllByRole("button", { name: "History" });
    await user.click(historyButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    });

    // Active styling applies once the modal is open. The rest of the page
    // (including this button) is now aria-hidden behind the modal's focus
    // trap, so check the captured element directly rather than re-querying.
    expect(historyButtons[0].className).toMatch(/bg-zinc-900/);
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
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    await user.click(screen.getAllByRole("button", { name: "History" })[0]);
    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Engineering Manager"));

    expect(mockPush).toHaveBeenCalledWith("/evaluator?job=job-1");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "History" })).not.toBeInTheDocument();
    });
  });
});
