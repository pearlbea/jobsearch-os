import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import JobTrackerForm from "./job-tracker-form";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";
import { makeJob } from "@/test/fixtures";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const job = makeJob({
  user_id: "user-123",
  company_name: "Acme",
  role_title: "Staff Engineer",
  location: "Madison, WI",
  raw_description: "Build things.",
  status: "applied",
  application_date: "2026-09-01",
  salary_range: "$150k–$180k",
  source: "LinkedIn",
  work_mode: "remote",
  match_score: 82,
  created_at: "2026-09-01T00:00:00Z",
});

describe("JobTrackerForm", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabase.single.mockResolvedValue({ data: { id: "job-1" }, error: null });
    (createClient as Mock).mockReturnValue(mockSupabase);
  });

  it("renders the job's current values", () => {
    render(<JobTrackerForm job={job} />);

    expect(screen.getByLabelText("Role Title")).toHaveValue("Staff Engineer");
    expect(screen.getByLabelText("Status")).toHaveValue("applied");
    expect(screen.getByLabelText("Work Mode")).toHaveValue("remote");
    expect(screen.getByLabelText("Application Date")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Salary Range")).toHaveValue("$150k–$180k");
    expect(screen.getByLabelText("Recruiter reached out first")).not.toBeChecked();
    expect(screen.getByLabelText("Contact Person")).toHaveValue("");
  });

  it("saves edits, scoped to the job and user, with blanks as null", async () => {
    const user = userEvent.setup();
    render(<JobTrackerForm job={job} />);

    await user.selectOptions(screen.getByLabelText("Status"), "interviewing");
    await user.type(screen.getByLabelText("Contact Person"), "  Dana Recruiter ");
    await user.clear(screen.getByLabelText("Salary Range"));
    await user.click(screen.getByLabelText("Recruiter reached out first"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Job updated successfully!")).toBeInTheDocument();
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "interviewing",
        contact_person: "Dana Recruiter",
        salary_range: null,
        recruiter_initiated: true,
        notes: null,
      }),
    );
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "job-1");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows an error when the save fails", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error("Network down"),
    });
    const user = userEvent.setup();
    render(<JobTrackerForm job={job} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<JobTrackerForm job={job} />);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
