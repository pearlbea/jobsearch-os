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
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(),
}));

import { POST } from "@/app/api/jobs/[id]/evaluate/route";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
} from "@/test/supabase-mock";

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/jobs/job-1/evaluate", {
    method: "POST",
  });
}

function makeProps(id = "job-1") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/jobs/[id]/evaluate", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabaseClient();

    (createClient as Mock).mockResolvedValue(
      mockSupabase as unknown as SupabaseClient,
    );
  });

  it("should return 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    });

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("should return 404 if the job doesn't exist for this user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "jobs") {
        return createMockQueryBuilder({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: new Error("Not found") }),
        });
      }
      return {};
    });

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "Job not found" });
  });

  it("should return 403 if the user has reached the evaluation limit", async () => {
    const mockUser = { id: "user-123" };
    const mockJob = {
      id: "job-1",
      user_id: mockUser.id,
      raw_description: "Engineering Manager role at Lyric...",
    };
    const mockProfile = {
      full_name: "Pearl Latteier",
      resume: "Software engineer...",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "jobs") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
        });
      }
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

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({
      error: "You've reached the limit of 5 evaluations for this demo.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should re-evaluate the job, save a new evaluation, and refresh the job's latest snapshot", async () => {
    const mockUser = { id: "user-123" };
    const mockJob = {
      id: "job-1",
      user_id: mockUser.id,
      company_name: "Lyric",
      role_title: "Engineering Manager",
      raw_description: "Lyric is looking for an Engineering Manager...",
    };
    const mockProfile = {
      full_name: "Pearl Latteier",
      resume: "Software engineer and leader with 16 years experience...",
    };
    const mockStories = [
      {
        title: "Vercel Admin App",
        company: "Vercel",
        competencies: ["Node.js", "React"],
      },
    ];

    const mockEvaluationResult = {
      co: "Lyric",
      title: "Engineering Manager",
      remote: true,
      score: 93,
      breakdown: { tech: 95, domain: 90, scope: 92 },
      strengths: ["Updated resume highlights leadership scope"],
      gaps: [],
      advice: "Lead with your recent platform ownership.",
      skills: ["Engineering Leadership", "HealthTech Data"],
    };

    const mockEvaluationSummary = {
      match_score: 93,
      score_breakdown: {
        technical_match: 95,
        domain_match: 90,
        leadership_match: 92,
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

    const mockSavedEvaluation = {
      id: "eval-2",
      job_id: "job-1",
      user_id: mockUser.id,
      match_score: 93,
      evaluation_summary: mockEvaluationSummary,
      resume_snapshot: mockProfile.resume,
    };

    const mockUpdatedJob = {
      ...mockJob,
      match_score: 93,
      evaluation_summary: mockEvaluationSummary,
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // First `.from("jobs")` call is the initial fetch (returns the
    // pre-evaluation job); the second is the post-update `.select().single()`
    // (returns the job with its refreshed latest-evaluation snapshot).
    let jobsCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "jobs") {
        jobsCallCount += 1;
        const data = jobsCallCount === 1 ? mockJob : mockUpdatedJob;
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({ data, error: null }),
        });
      }
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
      if (table === "evaluations") {
        return createMockQueryBuilder({
          single: vi
            .fn()
            .mockResolvedValue({ data: mockSavedEvaluation, error: null }),
        });
      }
      return {};
    });

    (generateText as Mock).mockResolvedValue({ output: mockEvaluationResult });

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      job: mockUpdatedJob,
      evaluation: mockSavedEvaluation,
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
