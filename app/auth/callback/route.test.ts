// @vitest-environment node
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

function createMockSupabase(exchangeCodeForSession: Mock) {
  return { auth: { exchangeCodeForSession } };
}

describe("GET /auth/callback", () => {
  let mockExchangeCodeForSession: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });

    (createClient as Mock).mockResolvedValue(
      createMockSupabase(
        mockExchangeCodeForSession,
      ) as unknown as SupabaseClient,
    );
  });

  it("sends a new sign-up straight to /profile when no next param is given", async () => {
    // Deliberately no `?next=` here: emailRedirectTo can't carry one without
    // its query string breaking Supabase's redirect allow-list match, so
    // this route's default destination has to cover that case on its own.
    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=abc123",
    );

    const res = await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(res.headers.get("location")).toBe("http://localhost:3000/profile");
  });

  it("honors an explicit safe next param", async () => {
    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=abc123&next=/evaluator",
    );

    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/evaluator",
    );
  });

  it("falls back to /profile for a protocol-relative next param", async () => {
    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=abc123&next=//evil.example.com",
    );

    const res = await GET(req);

    expect(res.headers.get("location")).toBe("http://localhost:3000/profile");
  });

  it("redirects to the login error state when the code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("invalid code"),
    });
    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=abc123",
    );

    const res = await GET(req);

    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
  });

  it("redirects to the login error state when no code is present", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback");

    const res = await GET(req);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?error=confirmation_failed",
    );
  });
});
