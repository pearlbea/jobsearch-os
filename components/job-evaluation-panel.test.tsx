import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import JobEvaluationPanel from "./job-evaluation-panel";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";
import { makeEvaluation, makeJob } from "@/test/fixtures";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const job = makeJob({ user_id: "user-123", raw_description: "Build things." });
const existingEvaluation = makeEvaluation({ id: "eval-1", match_score: 82 });
const newEvaluation = makeEvaluation({
  id: "eval-2",
  match_score: 64,
  created_at: "2026-09-01T00:00:00Z",
  evaluation_summary: {
    ...existingEvaluation.evaluation_summary,
    match_score: 64,
    positioning_advice: "Tailored advice.",
  },
});

const props = {
  job,
  userId: "user-123",
  initialEvaluations: [] as typeof existingEvaluation[],
  hasProfileResume: true,
};

describe("JobEvaluationPanel", () => {
  let mockSupabase: MockSupabaseClient;
  let fetchMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    // Saving the resume choice ends in .eq("id").eq("user_id"); every second
    // eq resolves the update.
    let eqCalls = 0;
    mockSupabase.eq.mockImplementation(() =>
      ++eqCalls % 2 ? mockSupabase : Promise.resolve({ data: null, error: null }),
    );
    (createClient as Mock).mockReturnValue(mockSupabase);
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, job, evaluation: newEvaluation }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("can't evaluate until the job has a saved description", async () => {
    render(
      <JobEvaluationPanel {...props} job={{ ...job, raw_description: "  " }} />,
    );

    expect(
      screen.getByText(/Add a job description in the details above/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluate" })).toBeDisabled();
  });

  it("evaluates with the profile resume by default and shows the result", async () => {
    const user = userEvent.setup();
    render(<JobEvaluationPanel {...props} />);

    expect(screen.getByLabelText(/My profile resume/)).toBeChecked();
    expect(screen.queryByLabelText("Tailored Resume")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(await screen.findByText("64%")).toBeInTheDocument();
    expect(screen.getByText("Tailored advice.")).toBeInTheDocument();
    // Choosing the profile resume clears any tailored one on the job.
    expect(mockSupabase.update).toHaveBeenCalledWith({ tailored_resume: null });
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "job-1");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job-1/evaluate", {
      method: "POST",
    });
    expect(mockSupabase.upsert).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Re-evaluate" })).toBeEnabled();
  });

  it("saves a tailored resume on the job before evaluating", async () => {
    const user = userEvent.setup();
    render(<JobEvaluationPanel {...props} />);

    await user.click(screen.getByLabelText("A resume tailored to this job"));
    await user.type(screen.getByLabelText("Tailored Resume"), "Tailored text.");
    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(mockSupabase.update).toHaveBeenCalledWith({
      tailored_resume: "Tailored text.",
    });
  });

  it("preselects and prefills the job's saved tailored resume", () => {
    render(
      <JobEvaluationPanel
        {...props}
        job={{ ...job, tailored_resume: "Saved tailored resume." }}
      />,
    );

    expect(screen.getByLabelText("A resume tailored to this job")).toBeChecked();
    expect(screen.getByLabelText("Tailored Resume")).toHaveValue(
      "Saved tailored resume.",
    );
  });

  it("requires tailored resume text", async () => {
    const user = userEvent.setup();
    render(<JobEvaluationPanel {...props} />);

    await user.click(screen.getByLabelText("A resume tailored to this job"));
    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Paste a resume to evaluate this job against.",
    );
    expect(mockSupabase.update).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("with no profile resume yet", () => {
    const noResumeProps = { ...props, hasProfileResume: false };

    it("saves the pasted resume to the profile by default", async () => {
      const user = userEvent.setup();
      render(<JobEvaluationPanel {...noResumeProps} />);

      expect(screen.queryByLabelText(/My profile resume/)).not.toBeInTheDocument();
      expect(
        screen.getByLabelText("Save as my default resume for other jobs too"),
      ).toBeChecked();
      await user.type(screen.getByLabelText("Your Resume"), "My resume.");
      await user.click(screen.getByRole("button", { name: "Evaluate" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-123", resume: "My resume." }),
        { onConflict: "id" },
      );
      expect(mockSupabase.update).toHaveBeenCalledWith({ tailored_resume: null });
      // It's the profile resume now, so the choice switches to it.
      expect(await screen.findByLabelText(/My profile resume/)).toBeChecked();
    });

    it("saves it only on this job when unchecked", async () => {
      const user = userEvent.setup();
      render(<JobEvaluationPanel {...noResumeProps} />);

      await user.type(screen.getByLabelText("Your Resume"), "Just for this job.");
      await user.click(
        screen.getByLabelText("Save as my default resume for other jobs too"),
      );
      await user.click(screen.getByRole("button", { name: "Evaluate" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
      expect(mockSupabase.update).toHaveBeenCalledWith({
        tailored_resume: "Just for this job.",
      });
    });
  });

  it("shows the API's error, such as the evaluation limit", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "You've reached the limit of 5 evaluations for this demo.",
      }),
    });
    const user = userEvent.setup();
    render(<JobEvaluationPanel {...props} />);

    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You've reached the limit of 5 evaluations for this demo.",
    );
    expect(screen.getByRole("button", { name: "Evaluate" })).toBeEnabled();
    expect(screen.queryByText("64%")).not.toBeInTheDocument();
  });

  it("doesn't evaluate when saving the resume choice fails", async () => {
    mockSupabase.eq.mockReset();
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, error: new Error("permission denied") });
    const user = userEvent.setup();
    render(<JobEvaluationPanel {...props} />);

    await user.click(screen.getByRole("button", { name: "Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("permission denied");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds a re-evaluation to the history and selects it", async () => {
    const user = userEvent.setup();
    render(
      <JobEvaluationPanel {...props} initialEvaluations={[existingEvaluation]} />,
    );

    expect(screen.getByText("Lead with platform work.")).toBeInTheDocument();
    expect(screen.queryByText(/Evaluation History/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Re-evaluate" }));

    expect(await screen.findByText("Evaluation History (2)")).toBeInTheDocument();
    expect(screen.getByText("Tailored advice.")).toBeInTheDocument();
    expect(screen.queryByText("Lead with platform work.")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <JobEvaluationPanel {...props} initialEvaluations={[existingEvaluation]} />,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
