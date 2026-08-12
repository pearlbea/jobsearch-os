import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./profile-form";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

// Mock Next.js router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("ProfileForm Component", () => {
  let mockSupabase: MockSupabaseClient;

  const defaultProps = {
    userId: "user-123",
    userEmail: "test@example.com",
    initialProfile: {
      id: "user-123",
      full_name: "Pearl Latteier",
      email: "test@example.com",
      target_titles: ["Engineering Manager", "Platform TPM"],
      location_preference: "Remote or Tulsa, OK",
      resume: "Experienced software leader with background in internal tools.",
      technical_skills: ["TypeScript", "Next.js", "Go"],
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    (createClient as Mock).mockReturnValue(mockSupabase);
  });

  it("renders with initial profile data", () => {
    render(<ProfileForm {...defaultProps} />);

    expect(screen.getByDisplayValue("Pearl Latteier")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Remote or Tulsa, OK")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/Experienced software leader/i),
    ).toBeInTheDocument();

    // Check rendered tags
    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Platform TPM")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("adds a new target title tag when typed and submitted", async () => {
    const user = userEvent.setup();
    render(<ProfileForm {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText(/Add title/i);
    await user.type(titleInput, "Staff Software Engineer{enter}");

    expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
    expect(titleInput).toHaveValue("");
  });

  it("removes a tag when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProfileForm {...defaultProps} />);

    const tagToRemove = screen.getByText("Platform TPM");
    expect(tagToRemove).toBeInTheDocument();

    // Find the '×' button associated with "Platform TPM"
    const removeButtons = screen.getAllByRole("button", { name: "×" });
    await user.click(removeButtons[1]); // second tag

    expect(screen.queryByText("Platform TPM")).not.toBeInTheDocument();
  });

  it("submits the form successfully and updates Supabase", async () => {
    const user = userEvent.setup();
    render(<ProfileForm {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("Pearl Latteier");
    await user.clear(nameInput);
    await user.type(nameInput, "Pearl L.");

    const submitButton = screen.getByRole("button", { name: /Save Profile/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-123",
          full_name: "Pearl L.",
          email: "test@example.com",
        }),
        { onConflict: "id" },
      );
      expect(
        screen.getByText("Profile updated successfully!"),
      ).toBeInTheDocument();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("displays an error message if Supabase upsert fails", async () => {
    mockSupabase.upsert.mockResolvedValueOnce({
      error: new Error("Database connection failed"),
    });

    const user = userEvent.setup();
    render(<ProfileForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /Save Profile/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Database connection failed"),
      ).toBeInTheDocument();
    });
  });
});
