import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "./page";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

// Mock Supabase Server Client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Next.js Navigation. Real Next.js `redirect()` always throws (a
// special NEXT_REDIRECT error) to interrupt rendering — a no-op mock would
// let the component keep executing past the redirect call.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// Mock the child ProfileForm client component
vi.mock("@/components/profile-form", () => ({
  ProfileForm: vi.fn(({ initialProfile, userId }) => (
    <div data-testid="profile-form">
      <span>User ID: {userId}</span>
      <span>Name: {initialProfile?.full_name || "None"}</span>
    </div>
  )),
}));

describe("ProfilePage Server Component", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    (createClient as Mock).mockResolvedValue(mockSupabase);
  });

  it("redirects to /login if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Auth required"),
    });

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("fetches profile data and renders ProfileForm for authenticated users", async () => {
    const mockUser = { id: "user-123", email: "pearl@example.com" };
    const mockProfile = {
      id: "user-123",
      full_name: "Pearl Latteier",
      target_titles: ["Engineering Manager"],
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    // Render the async Server Component
    const pageComponent = await ProfilePage();
    render(pageComponent);

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "user-123");
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
    expect(screen.getByText("User ID: user-123")).toBeInTheDocument();
    expect(screen.getByText("Name: Pearl Latteier")).toBeInTheDocument();
  });
});
