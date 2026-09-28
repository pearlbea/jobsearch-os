import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import JobEvaluateForm from "./job-evaluate-form";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const props = { jobId: "job-1", userId: "user-123", initialDescription: null };

describe("JobEvaluateForm", () => {
  let mockSupabase: MockSupabaseClient;
  let fetchMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    // The update ends in .eq("id").eq("user_id"); the second eq resolves it.
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, error: null });
    (createClient as Mock).mockReturnValue(mockSupabase);
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("saves the description, evaluates the job, and refreshes the page", async () => {
    const user = userEvent.setup();
    render(<JobEvaluateForm {...props} />);

    await user.type(screen.getByLabelText("Job Description"), "Build things.");
    await user.click(screen.getByRole("button", { name: "Save and Evaluate" }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ raw_description: "Build things." }),
    );
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, "id", "job-1");
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job-1/evaluate", {
      method: "POST",
    });
  });

  it("prefills an existing description", () => {
    render(<JobEvaluateForm {...props} initialDescription="Saved posting." />);
    expect(screen.getByLabelText("Job Description")).toHaveValue("Saved posting.");
  });

  it("requires a description before evaluating", async () => {
    const user = userEvent.setup();
    render(<JobEvaluateForm {...props} />);

    await user.click(screen.getByRole("button", { name: "Save and Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Paste the job description to evaluate it.",
    );
    expect(mockSupabase.update).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's error when the evaluation fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Add a resume to your profile before evaluating a job." }),
    });
    const user = userEvent.setup();
    render(<JobEvaluateForm {...props} />);

    await user.type(screen.getByLabelText("Job Description"), "Build things.");
    await user.click(screen.getByRole("button", { name: "Save and Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Add a resume to your profile before evaluating a job.",
    );
    expect(screen.getByRole("button", { name: "Save and Evaluate" })).toBeEnabled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not evaluate when saving the description fails", async () => {
    mockSupabase.eq.mockReset();
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, error: new Error("permission denied") });
    const user = userEvent.setup();
    render(<JobEvaluateForm {...props} />);

    await user.type(screen.getByLabelText("Job Description"), "Build things.");
    await user.click(screen.getByRole("button", { name: "Save and Evaluate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("permission denied");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<JobEvaluateForm {...props} />);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
