import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { EvaluationsList } from "./evaluations-list";
import type { JobSummary } from "@/types/database";

const jobs: JobSummary[] = [
  {
    id: "job-1",
    role_title: "Engineering Manager",
    company_name: "Acme Corp",
    match_score: 85,
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "job-2",
    role_title: "Platform TPM",
    company_name: "Globex",
    match_score: 45,
    created_at: "2026-07-15T00:00:00Z",
  },
];

describe("EvaluationsList Component", () => {
  const onSelectJob = vi.fn();
  const onDeleteJob = vi.fn();

  const defaultProps = {
    jobs,
    selectedJobId: null,
    onSelectJob,
    onDeleteJob,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true } as Response)),
    );
  });

  it("shows an empty state when there are no evaluations", () => {
    render(<EvaluationsList {...defaultProps} jobs={[]} />);

    expect(screen.getByText(/no saved evaluations yet/i)).toBeInTheDocument();
  });

  it("lists each evaluation with its role, company, and score", () => {
    render(<EvaluationsList {...defaultProps} />);

    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    expect(screen.getByText("Platform TPM")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("selects a job when its row is clicked", async () => {
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    await user.click(screen.getByText("Engineering Manager"));

    expect(onSelectJob).toHaveBeenCalledWith("job-1");
  });

  it("selects a job when its row is focused and Enter is pressed", async () => {
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    const row = screen.getByRole("button", { name: /Platform TPM/i });
    row.focus();
    await user.keyboard("{Enter}");

    expect(onSelectJob).toHaveBeenCalledWith("job-2");
  });

  it("selects a job when its row is focused and Space is pressed", async () => {
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    const row = screen.getByRole("button", { name: /Platform TPM/i });
    row.focus();
    await user.keyboard(" ");

    expect(onSelectJob).toHaveBeenCalledWith("job-2");
  });

  it("asks for confirmation and deletes the job when confirmed", async () => {
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete evaluation/i,
    });
    await user.click(deleteButtons[0]);

    expect(confirm).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/jobs/job-1", {
      method: "DELETE",
    });

    await vi.waitFor(() => {
      expect(onDeleteJob).toHaveBeenCalledWith("job-1");
    });

    // Deleting is a distinct action from selecting the row.
    expect(onSelectJob).not.toHaveBeenCalled();
  });

  it("does not delete the job when the confirmation is declined", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete evaluation/i,
    });
    await user.click(deleteButtons[0]);

    expect(fetch).not.toHaveBeenCalled();
    expect(onDeleteJob).not.toHaveBeenCalled();
  });

  it("alerts the user when deletion fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false } as Response)));
    const user = userEvent.setup();
    render(<EvaluationsList {...defaultProps} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete evaluation/i,
    });
    await user.click(deleteButtons[0]);

    await vi.waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Could not delete job evaluation.");
    });
    expect(onDeleteJob).not.toHaveBeenCalled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<EvaluationsList {...defaultProps} />);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
