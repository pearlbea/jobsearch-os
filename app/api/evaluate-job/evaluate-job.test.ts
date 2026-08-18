// @vitest-environment node
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((config) => config),
  },
  // Stub matching the real ai SDK's shape closely enough for route.ts's
  // `NoOutputGeneratedError.isInstance(error)` check in its catch block —
  // without this, any exception that reaches the catch block (including
  // ones unrelated to this class) fails with a confusing "no export"
  // error from the mock instead of exercising the real code path.
  NoOutputGeneratedError: class NoOutputGeneratedError {
    static isInstance(): boolean {
      return false;
    }
  },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(),
}));

import { POST } from "@/app/api/evaluate-job/route";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
} from "@/test/supabase-mock";

describe("POST /api/evaluate-job", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    // route.ts calls createClient() to get its Supabase client — without
    // this, the mocked createClient() resolves to undefined and every test
    // crashes on `supabase.auth.getUser()`.
    (createClient as Mock).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient,
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    // Mock unauthorized user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description: "Software Engineer position...",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("should return 400 if raw_description is missing", async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "raw_description is required" });
  });

  it("should return 400 if raw_description is whitespace only", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({ raw_description: "   \n\t  " }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "raw_description is required" });
  });

  it("should return 400 if raw_description is entirely boilerplate", async () => {
    const mockUser = { id: "user-123" };
    const mockProfile = {
      full_name: "Pearl Latteier",
      resume: "Software engineer...",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });
      }
      if (table === "evaluations") {
        return createMockQueryBuilder({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        });
      }
      if (table === "stories") {
        return createMockQueryBuilder({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
      }
      return {};
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description:
          "Equal Opportunity Employer. We do not discriminate based on race, gender, or other protected characteristics.",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error:
        "The job posting text is empty after removing boilerplate. Please check the pasted content.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should return 404 if user candidate profile is not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock profile query returning null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createMockQueryBuilder({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: new Error("Not found") }),
        });
      }
      return {};
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description: "Engineering Manager role at Lyric...",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({
      error: "Profile not found",
    });
  });

  it("should return 400 if the profile has no resume", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({
            data: { full_name: "Pearl Latteier", resume: null },
            error: null,
          }),
        });
      }
      return {};
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description: "Engineering Manager role at Lyric...",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error: "Add a resume to your profile before evaluating a job.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should return 403 if the user has reached the evaluation limit", async () => {
    const mockUser = { id: "user-123" };
    const mockProfile = {
      full_name: "Pearl Latteier",
      resume: "Software engineer...",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });
      }
      if (table === "evaluations") {
        return createMockQueryBuilder({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        });
      }
      return {};
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description: "Engineering Manager role at Lyric...",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({
      error: "You've reached the limit of 5 evaluations for this demo.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should evaluate job and save result to database successfully", async () => {
    const mockUser = { id: "user-123" };
    const mockProfile = {
      full_name: "Pearl Latteier",
      resume: "Software engineer and leader with 15 years experience...",
    };

    const mockStories = [
      {
        title: "Vercel Admin App",
        company: "Vercel",
        competencies: ["Node.js", "React"],
      },
    ];

    // Matches compactEvaluationSchema (lib/schemas/evaluation.ts) — the
    // short-key shape the route now asks the model for.
    const mockEvaluationResult = {
      co: "Lyric",
      title: "Engineering Manager",
      remote: true,
      breakdown: {
        tech: 90,
        domain: 85,
        scope: 90,
      },
      strengths: [
        "Strong HealthTech background",
        "Practical AI-assisted coding leadership",
      ],
      gaps: ["Multi-cloud Azure to AWS migration experience"],
      advice:
        "Highlight your Propeller Health experience alongside your Claude Code workflow.",
      skills: ["Engineering Leadership", "HealthTech Data"],
    };

    // What route.ts actually stores — the compact keys mapped back to the
    // full column/JSON shape (see `fullEvaluationSummary` in route.ts).
    const mockEvaluationSummary = {
      match_score: 88,
      score_breakdown: {
        technical_match: 90,
        domain_match: 85,
        leadership_match: 90,
      },
      key_strengths: mockEvaluationResult.strengths,
      potential_gaps: mockEvaluationResult.gaps,
      positioning_advice: mockEvaluationResult.advice,
      parsed_requirements: {
        required_skills: mockEvaluationResult.skills,
        preferred_skills: [],
        is_remote: true,
      },
    };

    const mockSavedJob = {
      id: "job-999",
      user_id: mockUser.id,
      company_name: "Lyric",
      role_title: "Engineering Manager",
      match_score: 88,
      evaluation_summary: mockEvaluationSummary,
    };

    const mockSavedEvaluation = {
      id: "eval-999",
      job_id: "job-999",
      user_id: mockUser.id,
      match_score: 88,
      evaluation_summary: mockEvaluationSummary,
      resume_snapshot: mockProfile.resume,
    };

    // Mock Supabase Queries
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });
      }
      if (table === "stories") {
        return createMockQueryBuilder({
          eq: vi.fn().mockResolvedValue({ data: mockStories, error: null }),
        });
      }
      if (table === "jobs") {
        return createMockQueryBuilder({
          single: vi
            .fn()
            .mockResolvedValue({ data: mockSavedJob, error: null }),
        });
      }
      if (table === "evaluations") {
        return createMockQueryBuilder({
          single: vi
            .fn()
            .mockResolvedValue({ data: mockSavedEvaluation, error: null }),
        });
      }
      return {};
    });

    // Mock AI SDK generateText response (structured via Output.object)
    (generateText as Mock).mockResolvedValue({
      output: mockEvaluationResult,
    });

    const req = new NextRequest("http://localhost:3000/api/evaluate-job", {
      method: "POST",
      body: JSON.stringify({
        raw_description: "Lyric is looking for an Engineering Manager...",
        job_url: "https://lyric.ai/careers/em",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      job: mockSavedJob,
      evaluation: mockSavedEvaluation,
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
