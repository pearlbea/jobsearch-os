import type { Interaction, Job } from "@/types/database";

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
