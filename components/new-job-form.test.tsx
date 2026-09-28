import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import NewJobForm from "./new-job-form";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

describe("NewJobForm", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabase.single.mockResolvedValue({ data: { id: "job-9" }, error: null });
    (createClient as Mock).mockReturnValue(mockSupabase);
  });

  it("creates the job for the user and opens its tracker page", async () => {
    const user = userEvent.setup();
    render(<NewJobForm userId="user-123" />);

    await user.type(screen.getByLabelText("Role Title"), " Staff Engineer ");
    await user.type(screen.getByLabelText("Company Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Add Job" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/tracker/job-9"));
    expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      user_id: "user-123",
      role_title: "Staff Engineer",
      company_name: "Acme",
      job_url: null,
    });
  });

  it("rejects a role title or company that's only whitespace", async () => {
    const user = userEvent.setup();
    render(<NewJobForm userId="user-123" />);

    await user.type(screen.getByLabelText("Role Title"), "   ");
    await user.type(screen.getByLabelText("Company Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Add Job" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Role title and company name are required.",
    );
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("shows an error and stays on the page when the insert fails", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error("Network down"),
    });
    const user = userEvent.setup();
    render(<NewJobForm userId="user-123" />);

    await user.type(screen.getByLabelText("Role Title"), "Staff Engineer");
    await user.type(screen.getByLabelText("Company Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Add Job" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(screen.getByRole("button", { name: "Add Job" })).toBeEnabled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NewJobForm userId="user-123" />);
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
