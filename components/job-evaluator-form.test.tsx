import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { JobEvaluatorForm } from "./job-evaluator-form";
import type { Job } from "@/types/database";

const mockJob: Job = {
  id: "job-1",
  user_id: "user-1",
  company_name: "Acme Corp",
  role_title: "Engineering Manager",
  location: "Remote",
  job_url: null,
  raw_description: "We are looking for a manager...",
  status: "bookmarked",
  match_score: 78,
  evaluation_summary: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
};

describe("JobEvaluatorForm Component", () => {
  const onEvaluationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables the submit button until a job description is entered", async () => {
    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    const submitButton = screen.getByRole("button", { name: /evaluate match/i });
    expect(submitButton).toBeDisabled();

    const description = screen.getByLabelText(/raw job description text/i);
    await user.type(description, "A great job posting");

    expect(submitButton).toBeEnabled();
  });

  it("keeps the submit button disabled for whitespace-only input", async () => {
    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    const description = screen.getByLabelText(/raw job description text/i);
    await user.type(description, "   ");

    expect(screen.getByRole("button", { name: /evaluate match/i })).toBeDisabled();
  });

  it("submits the description and URL, then reports the evaluated job", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: mockJob }),
        } as Response),
      ),
    );

    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    await user.type(
      screen.getByLabelText(/job listing url/i),
      "https://acme.example.com/careers/em",
    );
    await user.type(
      screen.getByLabelText(/raw job description text/i),
      "We are looking for a manager...",
    );
    await user.click(screen.getByRole("button", { name: /evaluate match/i }));

    await waitFor(() => {
      expect(onEvaluationComplete).toHaveBeenCalledWith(mockJob);
    });

    expect(fetch).toHaveBeenCalledWith("/api/evaluate-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw_description: "We are looking for a manager...",
        job_url: "https://acme.example.com/careers/em",
      }),
    });

    // Fields reset after a successful submission.
    expect(screen.getByLabelText(/job listing url/i)).toHaveValue("");
    expect(screen.getByLabelText(/raw job description text/i)).toHaveValue("");
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolveFetch: (value: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    await user.type(
      screen.getByLabelText(/raw job description text/i),
      "We are looking for a manager...",
    );
    const submitButton = screen.getByRole("button", { name: /evaluate match/i });
    await user.click(submitButton);

    expect(
      screen.getByRole("button", { name: /evaluating listing/i }),
    ).toBeDisabled();

    resolveFetch!({ ok: true, json: () => Promise.resolve({ job: mockJob }) });
    await waitFor(() => {
      expect(onEvaluationComplete).toHaveBeenCalled();
    });
  });

  it("shows an error message when the request fails and does not report completion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Could not parse job posting." }),
        } as Response),
      ),
    );

    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    await user.type(
      screen.getByLabelText(/raw job description text/i),
      "We are looking for a manager...",
    );
    await user.click(screen.getByRole("button", { name: /evaluate match/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Could not parse job posting."),
      ).toBeInTheDocument();
    });
    expect(onEvaluationComplete).not.toHaveBeenCalled();

    // Failed submissions keep the entered text so the user can retry.
    expect(screen.getByLabelText(/raw job description text/i)).toHaveValue(
      "We are looking for a manager...",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />,
    );

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });

  it("hides the fields and shows a 'New evaluation' trigger when collapsed", () => {
    render(
      <JobEvaluatorForm
        onEvaluationComplete={onEvaluationComplete}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/raw job description text/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new evaluation/i })).toBeInTheDocument();
  });

  it("calls onOpenChange when the collapse trigger is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <JobEvaluatorForm
        onEvaluationComplete={onEvaluationComplete}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /new evaluation/i }));

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("updates the trigger label when toggled in uncontrolled mode", async () => {
    const user = userEvent.setup();
    render(<JobEvaluatorForm onEvaluationComplete={onEvaluationComplete} />);

    await user.click(screen.getByRole("button", { name: /hide/i }));
    expect(screen.getByRole("button", { name: /new evaluation/i })).toBeInTheDocument();
  });
});
