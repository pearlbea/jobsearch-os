import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { ProfileForm } from "./profile-form";
import { createClient } from "@/lib/supabase/client";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

// Mock Next.js router
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
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
      resume: "Experienced software leader with background in internal tools.",
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
    expect(
      screen.getByDisplayValue(/Experienced software leader/i),
    ).toBeInTheDocument();

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
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("goes to the tracker after completing a profile with no resume yet", async () => {
    // A profile row is auto-created on email confirmation, so by the time
    // someone reaches this form a row already exists — it just has no
    // resume yet, which is the real signal for "hasn't completed setup".
    const user = userEvent.setup();
    render(
      <ProfileForm
        {...defaultProps}
        initialProfile={{
          id: "user-123",
          full_name: null,
          email: "test@example.com",
          resume: null,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        }}
      />,
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Jane Doe/i);
    await user.type(nameInput, "Pearl Latteier");

    const resumeInput = screen.getByPlaceholderText(/paste your resume here/i);
    await user.type(resumeInput, "Experienced software leader.");

    const submitButton = screen.getByRole("button", { name: /Save Profile/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.upsert).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/tracker");
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  it("goes to the tracker when no profile row exists yet", async () => {
    const user = userEvent.setup();
    render(<ProfileForm {...defaultProps} initialProfile={null} />);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Jane Doe/i);
    await user.type(nameInput, "Pearl Latteier");

    const submitButton = screen.getByRole("button", { name: /Save Profile/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.upsert).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/tracker");
      expect(mockRefresh).not.toHaveBeenCalled();
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

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<ProfileForm {...defaultProps} />);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
