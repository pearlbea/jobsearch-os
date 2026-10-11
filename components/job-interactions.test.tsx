import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import JobInteractions from "./job-interactions";
import { createClient } from "@/lib/supabase/client";
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from "@/test/supabase-mock";
import { Interaction } from "@/types/database";
import { makeInteraction } from "@/test/fixtures";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const baseInteraction = makeInteraction({
  user_id: "user-123",
  occurred_at: "2026-09-10T15:00:00Z",
  interviewer_names: ["Dana"],
  outcome: "scheduled",
  notes: "Went well.",
  created_at: "2026-09-01T00:00:00Z",
});

const props = {
  jobId: "job-1",
  userId: "user-123",
  jobStatus: "bookmarked" as const,
  initialInteractions: [baseInteraction],
};

describe("JobInteractions", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as Mock).mockReturnValue(mockSupabase);
  });

  it("shows an empty state with no interactions", () => {
    render(<JobInteractions {...props} initialInteractions={[]} />);
    expect(
      screen.getByText("No conversations or interviews yet."),
    ).toBeInTheDocument();
  });

  it("lists interactions, unscheduled first then newest first", () => {
    render(
      <JobInteractions
        {...props}
        initialInteractions={[
          baseInteraction,
          {
            ...baseInteraction,
            id: "int-2",
            kind: "technical",
            occurred_at: "2026-09-20T15:00:00Z",
          },
          {
            ...baseInteraction,
            id: "int-3",
            kind: "onsite",
            occurred_at: null,
          },
        ]}
      />,
    );

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "OnsiteScheduled",
      "TechnicalScheduled",
      "Recruiter ScreenScheduled",
    ]);
    expect(screen.getByText("Not scheduled")).toBeInTheDocument();
    expect(screen.getAllByText("With Dana")).toHaveLength(3);
  });

  it("adds an interaction scoped to the job and user", async () => {
    const created: Interaction = {
      ...baseInteraction,
      id: "int-new",
      kind: "technical",
      occurred_at: null,
      interviewer_names: ["Sam", "Lee"],
      outcome: null,
      notes: null,
    };
    mockSupabase.single.mockResolvedValue({ data: created, error: null });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Add Interaction" }));
    await user.selectOptions(screen.getByLabelText("Type"), "technical");
    await user.type(screen.getByLabelText("With"), "Sam, , Lee ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Technical")).toBeInTheDocument();
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      kind: "technical",
      occurred_at: null,
      interviewer_names: ["Sam", "Lee"],
      outcome: null,
      notes: null,
      job_id: "job-1",
      user_id: "user-123",
    });
    expect(
      screen.queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });

  it("edits an interaction", async () => {
    mockSupabase.single.mockResolvedValue({
      data: { ...baseInteraction, outcome: "cancelled" },
      error: null,
    });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.selectOptions(screen.getByLabelText("Outcome"), "cancelled");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "cancelled" }),
    );
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "int-1");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("keeps the form open and shows an error when saving fails", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error("Network down"),
    });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Add Interaction" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("keeps a newly opened add form open when an earlier edit finishes saving", async () => {
    let resolveSave!: (value: unknown) => void;
    mockSupabase.single.mockReturnValue(
      new Promise((resolve) => (resolveSave = resolve)),
    );
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    // While the edit is still saving, start adding a new interaction.
    await user.click(screen.getByRole("button", { name: "Add Interaction" }));
    const addForm = screen.getByRole("form", { name: "Add interaction" });
    await user.type(within(addForm).getByLabelText("With"), "Sam");

    resolveSave({
      data: { ...baseInteraction, outcome: "cancelled" },
      error: null,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: "Recruiter ScreenCancelled",
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("form", { name: "Edit Recruiter Screen" }),
    ).not.toBeInTheDocument();
    expect(within(addForm).getByLabelText("With")).toHaveValue("Sam");
  });

  it("keeps a newly opened edit form open when an earlier add finishes saving", async () => {
    let resolveSave!: (value: unknown) => void;
    mockSupabase.single.mockReturnValue(
      new Promise((resolve) => (resolveSave = resolve)),
    );
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Add Interaction" }));
    const addForm = screen.getByRole("form", { name: "Add interaction" });
    await user.selectOptions(
      within(addForm).getByLabelText("Type"),
      "technical",
    );
    await user.click(within(addForm).getByRole("button", { name: "Add" }));
    // While the add is still saving, start editing the existing interaction.
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editForm = screen.getByRole("form", {
      name: "Edit Recruiter Screen",
    });
    await user.type(
      within(editForm).getByLabelText("Notes"),
      " Follow-up sent.",
    );

    resolveSave({
      data: { ...baseInteraction, id: "int-new", kind: "technical" },
      error: null,
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: /^Technical/ }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("form", { name: "Add interaction" }),
    ).not.toBeInTheDocument();
    expect(within(editForm).getByLabelText("Notes")).toHaveValue(
      "Went well. Follow-up sent.",
    );
  });

  it("keeps unsaved input in the add form when an edit form is opened", async () => {
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Add Interaction" }));
    const addForm = screen.getByRole("form", { name: "Add interaction" });
    await user.type(within(addForm).getByLabelText("With"), "Sam");
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(
      screen.getByRole("form", { name: "Edit Recruiter Screen" }),
    ).toBeInTheDocument();
    expect(within(addForm).getByLabelText("With")).toHaveValue("Sam");
  });

  it("keeps unsaved input in one edit form when another is opened, and cancels them independently", async () => {
    const user = userEvent.setup();
    render(
      <JobInteractions
        {...props}
        initialInteractions={[
          baseInteraction,
          {
            ...baseInteraction,
            id: "int-2",
            kind: "technical",
            occurred_at: "2026-09-20T15:00:00Z",
          },
        ]}
      />,
    );

    const screenItem = screen
      .getByRole("heading", { level: 3, name: /^Recruiter Screen/ })
      .closest("li")!;
    await user.click(within(screenItem).getByRole("button", { name: "Edit" }));
    const screenForm = screen.getByRole("form", {
      name: "Edit Recruiter Screen",
    });
    await user.type(within(screenForm).getByLabelText("Notes"), " More.");

    const technicalItem = screen
      .getByRole("heading", { level: 3, name: /^Technical/ })
      .closest("li")!;
    await user.click(
      within(technicalItem).getByRole("button", { name: "Edit" }),
    );
    const technicalForm = screen.getByRole("form", { name: "Edit Technical" });

    expect(within(screenForm).getByLabelText("Notes")).toHaveValue(
      "Went well. More.",
    );

    await user.click(
      within(technicalForm).getByRole("button", { name: "Cancel" }),
    );

    expect(technicalForm).not.toBeInTheDocument();
    expect(within(screenForm).getByLabelText("Notes")).toHaveValue(
      "Went well. More.",
    );
  });

  // Delete ends in .eq("id").eq("user_id"), so the second eq resolves the query.
  const mockDeleteResult = (result: { error: unknown }) =>
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, ...result });

  it("deletes an interaction after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDeleteResult({ error: null });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    const item = screen.getByText("Recruiter Screen").closest("li")!;
    await user.click(within(item).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.getByText("No conversations or interviews yet."),
      ).toBeInTheDocument();
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, "id", "int-1");
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, "user_id", "user-123");
  });

  it("keeps the interaction and shows an error when the delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDeleteResult({ error: { message: "permission denied" } });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "permission denied",
    );
    expect(screen.getByText("Recruiter Screen")).toBeInTheDocument();
  });

  it("does not delete when the confirm is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mockSupabase.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Recruiter Screen")).toBeInTheDocument();
  });

  it("has no accessibility violations with the add form open", async () => {
    const user = userEvent.setup();
    const { container } = render(<JobInteractions {...props} />);
    await user.click(screen.getByRole("button", { name: "Add Interaction" }));

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  describe("advancing the job status", () => {
    beforeEach(() => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "job-1" },
        error: null,
      });
    });

    const addCompleted = async (kind: string, data: Interaction) => {
      mockSupabase.single.mockResolvedValue({ data, error: null });
      const user = userEvent.setup();
      render(<JobInteractions {...props} initialInteractions={[]} />);
      await user.click(screen.getByRole("button", { name: "Add Interaction" }));
      await user.selectOptions(screen.getByLabelText("Type"), kind);
      await user.selectOptions(screen.getByLabelText("Outcome"), "completed");
      await user.click(screen.getByRole("button", { name: "Add" }));
    };

    it("sets outreach_sent when outreach is completed on a bookmarked job", async () => {
      await addCompleted("outreach", {
        ...baseInteraction,
        id: "n",
        kind: "outreach",
        outcome: "completed",
      });

      expect(
        await screen.findByText("Job status updated to Outreach Sent."),
      ).toBeInTheDocument();
      expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: "outreach_sent",
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "job-1");
      expect(mockSupabase.in).toHaveBeenCalledWith("status", ["bookmarked"]);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("sets interviewing when a recruiter screen is completed", async () => {
      await addCompleted("recruiter_screen", {
        ...baseInteraction,
        id: "n",
        kind: "recruiter_screen",
        outcome: "completed",
      });

      await waitFor(() =>
        expect(mockSupabase.update).toHaveBeenCalledWith({
          status: "interviewing",
        }),
      );
    });

    it("leaves the status alone for other kinds", async () => {
      await addCompleted("technical", {
        ...baseInteraction,
        id: "n",
        kind: "technical",
        outcome: "completed",
      });

      await screen.findByText("Technical");
      expect(mockSupabase.from).not.toHaveBeenCalledWith("jobs");
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("advances when an edit marks an interaction completed", async () => {
      const scheduled = {
        ...baseInteraction,
        kind: "recruiter_screen" as const,
        outcome: "scheduled" as const,
      };
      mockSupabase.single.mockResolvedValue({
        data: { ...scheduled, outcome: "completed" },
        error: null,
      });
      const user = userEvent.setup();
      render(<JobInteractions {...props} initialInteractions={[scheduled]} />);

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.selectOptions(screen.getByLabelText("Outcome"), "completed");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(mockSupabase.update).toHaveBeenCalledWith({
          status: "interviewing",
        }),
      );
    });

    it("doesn't re-advance when an already completed interaction is re-saved", async () => {
      const done = {
        ...baseInteraction,
        kind: "recruiter_screen" as const,
        outcome: "completed" as const,
      };
      mockSupabase.single.mockResolvedValue({
        data: { ...done, notes: "Updated." },
        error: null,
      });
      const user = userEvent.setup();
      render(<JobInteractions {...props} initialInteractions={[done]} />);

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      await screen.findByText("Updated.");
      expect(mockSupabase.from).not.toHaveBeenCalledWith("jobs");
    });

    it("reports a status update that matched no job", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
      await addCompleted("outreach", {
        ...baseInteraction,
        id: "n",
        kind: "outreach",
        outcome: "completed",
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "changed elsewhere or the job wasn't found",
      );
    });

    it("reports a thrown status update instead of failing the save", async () => {
      mockSupabase.maybeSingle.mockRejectedValue(new Error("network down"));
      await addCompleted("outreach", {
        ...baseInteraction,
        id: "n",
        kind: "outreach",
        outcome: "completed",
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "network down",
      );
      expect(screen.getByText("Outreach")).toBeInTheDocument();
    });

    it("reports a failed status update without losing the saved interaction", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: new Error("denied"),
      });
      await addCompleted("outreach", {
        ...baseInteraction,
        id: "n",
        kind: "outreach",
        outcome: "completed",
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Saved, but couldn't update the job status: denied",
      );
      expect(screen.getByText("Outreach")).toBeInTheDocument();
    });
  });
});
