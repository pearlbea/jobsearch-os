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

  const defaultProps = {
    jobs,
    selectedJobId: null,
    onSelectJob,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<EvaluationsList {...defaultProps} />);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });

  it("does not render a re-evaluate button when onReevaluateJob isn't provided", () => {
    render(<EvaluationsList {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /re-evaluate/i }),
    ).not.toBeInTheDocument();
  });

  it("re-evaluates a job from its row without also selecting it", async () => {
    const onReevaluateJob = vi.fn();
    const user = userEvent.setup();
    render(
      <EvaluationsList {...defaultProps} onReevaluateJob={onReevaluateJob} />,
    );

    const reevaluateButtons = screen.getAllByRole("button", {
      name: /re-evaluate with current resume/i,
    });
    await user.click(reevaluateButtons[0]);

    expect(onReevaluateJob).toHaveBeenCalledWith("job-1");
    expect(onSelectJob).not.toHaveBeenCalled();
  });

  it("disables the re-evaluate button for the job currently being re-evaluated", () => {
    render(
      <EvaluationsList
        {...defaultProps}
        onReevaluateJob={vi.fn()}
        reevaluatingJobId="job-2"
      />,
    );

    const reevaluateButtons = screen.getAllByRole("button", {
      name: /re-evaluate with current resume/i,
    });
    expect(reevaluateButtons[0]).toBeEnabled();
    expect(reevaluateButtons[1]).toBeDisabled();
  });

  it("shows a tooltip describing the re-evaluate action on hover", async () => {
    const user = userEvent.setup();
    render(
      <EvaluationsList {...defaultProps} onReevaluateJob={vi.fn()} />,
    );

    const [reevaluateButton] = screen.getAllByRole("button", {
      name: /re-evaluate with current resume/i,
    });
    await user.hover(reevaluateButton);

    expect(
      await screen.findByRole("tooltip", {
        name: /re-evaluate with current resume/i,
      }),
    ).toBeInTheDocument();
  });

  it("has no detectable accessibility violations with the re-evaluate action enabled", async () => {
    const { container } = render(
      <EvaluationsList {...defaultProps} onReevaluateJob={vi.fn()} />,
    );

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
