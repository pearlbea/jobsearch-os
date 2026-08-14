import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { RailShell } from "./rail-shell";

let mockPathname = "/evaluator";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("RailShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/evaluator";
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
    expect(evaluateLinks[0].className).toMatch(/bg-primary/);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
