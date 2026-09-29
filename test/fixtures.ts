import type {
  Evaluation,
  Interaction,
  Job,
  Profile,
  Story,
} from "@/types/database";

/**
 * A complete `Job` row with neutral defaults: every optional tracker field
 * null, no evaluation yet. Pass only the fields a test cares about, so adding
 * a column to `Job` means updating this one default instead of every test.
 */
export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    user_id: "user-1",
    company_name: "Acme Corp",
    role_title: "Engineering Manager",
    location: null,
    job_url: null,
    raw_description: "We are looking for...",
    status: "bookmarked",
    application_date: null,
    contact_person: null,
    salary_range: null,
    recruiter_initiated: false,
    next_action: null,
    next_action_date: null,
    source: null,
    referral_name: null,
    notes: null,
    closed_reason: null,
    work_mode: null,
    tailored_resume: null,
    match_score: null,
    evaluation_summary: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

/** A complete `Interaction` row; same idea as `makeJob`. */
export function makeInteraction(
  overrides: Partial<Interaction> = {},
): Interaction {
  return {
    id: "int-1",
    job_id: "job-1",
    user_id: "user-1",
    kind: "recruiter_screen",
    occurred_at: null,
    interviewer_names: null,
    outcome: null,
    notes: null,
    story_ids: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

/** A complete `Evaluation` row; same idea as `makeJob`. */
export function makeEvaluation(
  overrides: Partial<Evaluation> = {},
): Evaluation {
  return {
    id: "eval-1",
    job_id: "job-1",
    user_id: "user-1",
    match_score: 82,
    evaluation_summary: {
      match_score: 82,
      score_breakdown: {
        technical_match: 85,
        domain_match: 80,
        leadership_match: 80,
      },
      key_strengths: ["Led a platform migration"],
      potential_gaps: [],
      positioning_advice: "Lead with platform work.",
    },
    resume_snapshot: "Profile resume.",
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

/** A complete `Profile` row; same idea as `makeJob`. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    full_name: null,
    email: null,
    resume: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

/** A complete `Story` row; same idea as `makeJob`. */
export function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "story-1",
    user_id: "user-1",
    title: "Led a platform migration",
    company: null,
    competencies: null,
    story_text: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}
