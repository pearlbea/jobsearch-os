import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import JobInteractions from "./job-interactions";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";
import { Interaction } from "@/types/database";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const baseInteraction: Interaction = {
  id: "int-1",
  job_id: "job-1",
  user_id: "user-123",
  kind: "recruiter_screen",
  occurred_at: "2026-09-10T15:00:00Z",
  interviewer_names: ["Dana"],
  outcome: "passed",
  notes: "Went well.",
  story_ids: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: null,
};

const props = {
  jobId: "job-1",
  userId: "user-123",
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
          { ...baseInteraction, id: "int-2", kind: "technical", occurred_at: "2026-09-20T15:00:00Z" },
          { ...baseInteraction, id: "int-3", kind: "onsite", occurred_at: null },
        ]}
      />,
    );

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "OnsitePassed",
      "TechnicalPassed",
      "Recruiter ScreenPassed",
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
      data: { ...baseInteraction, outcome: "rejected" },
      error: null,
    });
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.selectOptions(screen.getByLabelText("Outcome"), "rejected");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Rejected")).toBeInTheDocument();
    });
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "rejected" }),
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

  it("deletes an interaction after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<JobInteractions {...props} />);

    const item = screen.getByText("Recruiter Screen").closest("li")!;
    await user.click(within(item).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.getByText("No conversations or interviews yet."),
      ).toBeInTheDocument();
    });
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "int-1");
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
});
