import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { RailShell } from "./rail-shell";

let mockPathname = "/tracker";

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
    mockPathname = "/tracker";
  });

  it("renders the wordmark, nav items, user email, and sign out", () => {
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    expect(
      screen.getAllByRole("link", { name: "JobFit Scorecard" })[0],
    ).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Profile" })[0]).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getAllByRole("link", { name: "Tracker" })[0]).toHaveAttribute(
      "href",
      "/tracker",
    );
    expect(screen.getAllByText("pearl@example.com")[0]).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    ).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
    // Evaluation lives on each job's tracker page now.
    expect(screen.queryByRole("link", { name: "Evaluate" })).not.toBeInTheDocument();
  });

  it("marks the Tracker link active when its path matches", () => {
    mockPathname = "/tracker";
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    const trackerLinks = screen.getAllByRole("link", { name: "Tracker" });
    expect(trackerLinks[0].className).toMatch(/bg-primary/);
  });

  it("keeps the Tracker link active on a job's tracker page", () => {
    mockPathname = "/tracker/job-1";
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    const trackerLinks = screen.getAllByRole("link", { name: "Tracker" });
    expect(trackerLinks[0].className).toMatch(/bg-primary/);
    const profileLinks = screen.getAllByRole("link", { name: "Profile" });
    expect(profileLinks[0].className).not.toMatch(/bg-primary/);
  });

  it("doesn't treat a path that merely starts with the same letters as active", () => {
    mockPathname = "/trackers";
    render(
      <RailShell userEmail="pearl@example.com">
        <div>content</div>
      </RailShell>,
    );

    const trackerLinks = screen.getAllByRole("link", { name: "Tracker" });
    expect(trackerLinks[0].className).not.toMatch(/bg-primary/);
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
