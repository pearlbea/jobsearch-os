import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JobTrackerRow from "./job-tracker-row";
import { makeJob } from "@/test/fixtures";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

const job = makeJob({ status: "outreach_sent", match_score: 82 });

// Rows render inside the tracker page's <ul>.
const renderRow = (j = job) =>
  render(
    <ul>
      <JobTrackerRow job={j} />
    </ul>,
  );

describe("JobTrackerRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("links to the job and shows the status label", () => {
    renderRow();

    expect(
      screen.getByRole("link", { name: /Engineering Manager, Acme Corp/ }),
    ).toHaveAttribute("href", "/tracker/job-1");
    expect(screen.getByText("Outreach Sent")).toBeInTheDocument();
  });

  it("shows placeholders when the job has no status or evaluation", () => {
    renderRow(makeJob({ status: null, match_score: null }));

    expect(screen.getByText("No status")).toBeInTheDocument();
  });

  it("links an evaluated job's fit band to its Evaluation tab", () => {
    renderRow();

    const badge = screen.getByRole("link", {
      name: "Good fit: view evaluation for Engineering Manager at Acme Corp",
    });
    expect(badge).toHaveAttribute("href", "/tracker/job-1/evaluation");
    expect(badge).toHaveTextContent("Good fit");
    expect(badge).not.toHaveTextContent("82");
  });

  it("offers an Evaluate link for a job with no evaluation", () => {
    renderRow(makeJob({ match_score: null }));

    expect(screen.getByRole("link", { name: /Evaluate/ })).toHaveAttribute(
      "href",
      "/tracker/job-1/evaluation",
    );
  });
});
