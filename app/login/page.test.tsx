import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { createClient } from "@/lib/supabase/client";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("LoginPage", () => {
  let mockSignInWithPassword: Mock;
  let mockSignUp: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchParams = new URLSearchParams();

    mockSignInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mockSignUp = vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null });

    (createClient as Mock).mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
      },
    });
  });

  it("defaults to sign-in mode when no mode search param is present", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("shows the sign-up form when the mode search param is sign-up", () => {
    mockSearchParams = new URLSearchParams({ mode: "sign-up" });
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Create an account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign up" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Must be at least 12 characters."),
    ).toBeInTheDocument();
  });

  it("ignores unrecognized mode values and falls back to sign-in", () => {
    mockSearchParams = new URLSearchParams({ mode: "bogus" });
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("sends new sign-ups to the profile page once they confirm their email", async () => {
    mockSearchParams = new URLSearchParams({ mode: "sign-up" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "a-long-password-123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "a-long-password-123",
      options: {
        emailRedirectTo: expect.stringMatching(
          /\/auth\/callback\?next=\/profile$/,
        ),
      },
    });
  });
});
