import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { createClient } from "@/lib/supabase/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

async function renderLoginPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  let utils!: ReturnType<typeof render>;
  // The page reads `searchParams` via React's `use()`, which suspends on the
  // first pass even though the promise is already resolved; flushing inside
  // an async `act` lets the resolved value commit before we assert on it.
  await act(async () => {
    utils = render(
      <Suspense fallback={null}>
        <LoginPage searchParams={Promise.resolve(searchParams)} />
      </Suspense>,
    );
  });
  return utils;
}

describe("LoginPage", () => {
  let mockSignInWithPassword: Mock;
  let mockSignUp: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

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

  it("defaults to sign-in mode when no mode search param is present", async () => {
    await renderLoginPage();

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("shows the sign-up form when the mode search param is sign-up", async () => {
    await renderLoginPage({ mode: "sign-up" });

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

  it("ignores unrecognized mode values and falls back to sign-in", async () => {
    await renderLoginPage({ mode: "bogus" });

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("sends new sign-ups to the profile page once they confirm their email", async () => {
    const user = userEvent.setup();
    await renderLoginPage({ mode: "sign-up" });

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
