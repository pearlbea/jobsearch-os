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

  it.each([null, "   "])(
    "should return 400 without spending anything if the job has no description (%j)",
    async (raw_description) => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "jobs") {
          return createMockQueryBuilder({
            single: vi.fn().mockResolvedValue({
              data: { id: "job-1", user_id: "user-123", raw_description },
              error: null,
            }),
          });
        }
        throw new Error(`Unexpected query on ${table}`);
      });

      const res = await POST(makeRequest(), makeProps());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error: "Add a job description before evaluating this job.",
      });
      expect(generateText).not.toHaveBeenCalled();
    },
  );

  it("should return 400 if the job's posting text is entirely boilerplate", async () => {
    const mockUser = { id: "user-123" };
    const mockJob = {
      id: "job-1",
      user_id: mockUser.id,
      raw_description:
        "Equal Opportunity Employer. We do not discriminate based on race, gender, or other protected characteristics.",
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
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
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

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error:
        "This job's posting text is empty after removing boilerplate and can't be re-evaluated.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should return 400 if the profile has no resume", async () => {
    const mockUser = { id: "user-123" };
    const mockJob = {
      id: "job-1",
      user_id: mockUser.id,
      raw_description: "Engineering Manager role at Lyric...",
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
          maybeSingle: vi.fn().mockResolvedValue({
            data: { full_name: "Pearl Latteier", resume: null },
            error: null,
          }),
        });
      }
      return {};
    });

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error:
        "Add a resume, either to your profile or tailored to this job, before evaluating.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should return 400 with no profile row and no tailored resume", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "jobs") {
        return createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({
            data: { id: "job-1", user_id: "user-123", raw_description: "A role." },
            error: null,
          }),
        });
      }
      if (table === "profiles") {
        return createMockQueryBuilder({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
      }
      throw new Error(`Unexpected query on ${table}`);
    });

    const res = await POST(makeRequest(), makeProps());

    expect(res.status).toBe(400);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("should return 403, without updating the job, when the limit trigger refuses the insert", async () => {
    // Two requests passed the fast-path count; the other one took the last slot.
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const jobsBuilders: ReturnType<typeof createMockQueryBuilder>[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "jobs") {
        const builder = createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({
            data: { id: "job-1", user_id: "user-123", raw_description: "A role." },
            error: null,
          }),
        });
        jobsBuilders.push(builder);
        return builder;
      }
      if (table === "profiles") {
        return createMockQueryBuilder({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { full_name: "Pearl Latteier", resume: "A resume." },
            error: null,
          }),
        });
      }
      if (table === "stories") {
        return createMockQueryBuilder({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
      }
      return createMockQueryBuilder({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "EVLIM", message: "evaluation limit reached" },
        }),
      });
    });
    (generateText as Mock).mockResolvedValue({
      output: {
        co: "Lyric",
        title: "Engineering Manager",
        remote: true,
        breakdown: { tech: 80, domain: 80, scope: 80 },
        strengths: [],
        gaps: [],
        advice: "",
        skills: [],
      },
    });

    const res = await POST(makeRequest(), makeProps());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toEqual({
      error: "You've reached the limit of 5 evaluations for this demo.",
    });
    // Only the initial job fetch; the snapshot update never ran.
    expect(jobsBuilders).toHaveLength(1);
    expect(jobsBuilders[0].update).not.toHaveBeenCalled();
  });

  describe("which resume is evaluated", () => {
    const profileResume = "Profile resume: platform engineering leader.";
    const tailoredResume = "Tailored resume: HealthTech data platform lead.";

    // Runs a successful evaluation and returns what was inserted into
    // `evaluations` and what was sent to the model.
    async function evaluate(
      job: Record<string, unknown>,
      profile: Record<string, unknown> | null = {
        full_name: "Pearl Latteier",
        resume: profileResume,
      },
    ) {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      const evaluationBuilders: ReturnType<typeof createMockQueryBuilder>[] = [];
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "jobs") {
          return createMockQueryBuilder({
            single: vi.fn().mockResolvedValue({ data: job, error: null }),
          });
        }
        if (table === "profiles") {
          return createMockQueryBuilder({
            maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
          });
        }
        if (table === "stories") {
          return createMockQueryBuilder({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          });
        }
        const builder = createMockQueryBuilder({
          single: vi.fn().mockResolvedValue({
            data: { id: "eval-2", match_score: 80, evaluation_summary: {} },
            error: null,
          }),
        });
        evaluationBuilders.push(builder);
        return builder;
      });
      (generateText as Mock).mockResolvedValue({
        output: {
          co: "Lyric",
          title: "Engineering Manager",
          remote: true,
          breakdown: { tech: 80, domain: 80, scope: 80 },
          strengths: [],
          gaps: [],
          advice: "",
          skills: [],
        },
      });

      const res = await POST(makeRequest(), makeProps());
      expect(res.status).toBe(200);

      const inserted = evaluationBuilders
        .flatMap((b) => b.insert.mock.calls)
        .map(([row]) => row);
      return {
        inserted,
        prompt: JSON.stringify((generateText as Mock).mock.calls[0][0]),
      };
    }

    const baseJob = {
      id: "job-1",
      user_id: "user-123",
      raw_description: "Lyric is looking for an Engineering Manager...",
    };

    it("uses the job's tailored resume when it has one", async () => {
      const { inserted, prompt } = await evaluate({
        ...baseJob,
        tailored_resume: tailoredResume,
      });

      expect(inserted).toEqual([
        expect.objectContaining({ resume_snapshot: tailoredResume }),
      ]);
      expect(prompt).toContain("HealthTech data platform lead");
      expect(prompt).not.toContain("platform engineering leader");
    });

    it("uses the tailored resume when the user has no profile row yet", async () => {
      const { inserted, prompt } = await evaluate(
        { ...baseJob, tailored_resume: tailoredResume },
        null,
      );

      expect(inserted).toEqual([
        expect.objectContaining({ resume_snapshot: tailoredResume }),
      ]);
      expect(prompt).toContain("HealthTech data platform lead");
    });

    it.each([null, "   "])(
      "falls back to the profile resume when the tailored one is %j",
      async (tailored_resume) => {
        const { inserted, prompt } = await evaluate({
          ...baseJob,
          tailored_resume,
        });

        expect(inserted).toEqual([
          expect.objectContaining({ resume_snapshot: profileResume }),
        ]);
        expect(prompt).toContain("platform engineering leader");
      },
    );
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
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
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
      breakdown: { tech: 95, domain: 90, scope: 92 },
      strengths: ["Updated resume highlights leadership scope"],
      gaps: [],
      advice: "Lead with your recent platform ownership.",
      skills: ["Engineering Leadership", "HealthTech Data"],
    };

    const mockEvaluationSummary = {
      match_score: 92,
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
      match_score: 92,
      evaluation_summary: mockEvaluationSummary,
      resume_snapshot: mockProfile.resume,
    };

    const mockUpdatedJob = {
      ...mockJob,
      match_score: 92,
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
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
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
