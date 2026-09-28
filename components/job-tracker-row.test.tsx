import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import JobTrackerRow from "./job-tracker-row";
import { Job } from "@/types/database";

const job = {
  id: "job-1",
  role_title: "Staff Engineer",
  company_name: "Acme",
  status: "outreach_sent",
  match_score: 82,
  created_at: "2026-09-01T12:00:00Z",
} as Job;

describe("JobTrackerRow", () => {
  it("links to the job and shows the status label", () => {
    render(<JobTrackerRow job={job} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/tracker/job-1");
    expect(screen.getByText("Outreach Sent")).toBeInTheDocument();
  });

  it("shows a placeholder when the job has no status", () => {
    render(<JobTrackerRow job={{ ...job, status: null }} />);

    expect(screen.getByText("No status")).toBeInTheDocument();
  });
});
