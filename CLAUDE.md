@AGENTS.md

# App overview

JobFit Scorecard: a candidate adds jobs to a tracker, then optionally evaluates each one against their resume to get a
Claude-generated fit evaluation (match score + technical/domain/scope
breakdown, ATS keyword scan, strengths/gaps, positioning advice). Users can also
track application details and conversations/interviews.

- **Auth & storage**: Supabase (email/password auth via `lib/supabase/`,
  `proxy.ts` middleware refreshes the session). `supabase/schema.sql`
  creates the full current schema from scratch (idempotent; it's what the
  README tells people to run). `supabase/migrations/` holds the incremental
  changes applied by hand to the live project; the base `create table`s
  were never recorded there. **Any schema change needs a new migration AND
  the same change in `schema.sql` AND `types/database.ts`**;
  `supabase/schema.test.ts` fails if `schema.sql`'s columns drift from the
  types (via the `test/fixtures.ts` row factories).
- **Evaluation flow**: evaluation happens only on a job's tracker page
  (`components/job-evaluation-panel.tsx`), via
  `app/api/jobs/[id]/evaluate/route.ts`. It evaluates the job's saved
  `raw_description` against the job's `tailored_resume` if set, else the
  profile resume (recorded per evaluation in `evaluations.resume_snapshot`).
  `lib/evaluation-engine.ts` strips EOE/boilerplate footer text, redacts PII
  from the resume, and prompts Claude (`@ai-sdk/anthropic` + Vercel `ai` SDK)
  for structured output against `lib/schemas/evaluation.ts`
  (`compactEvaluationSchema`, with deliberately short field names to cut
  completion tokens), then maps it back to the full `EvaluationSummary`.
  Each run inserts an `evaluations` row; `jobs.match_score` /
  `evaluation_summary` hold a snapshot of the latest one. Capped at
  `MAX_EVALUATIONS_PER_USER`: the route checks it before calling Claude, but
  the `evaluations_enforce_limit` trigger in `schema.sql` is what enforces it
  (the number is duplicated there; `schema.test.ts` keeps them equal).
- **Pages**: `/` (dashboard/landing), `/profile` (profile + default resume),
  `/tracker` (job list), `/tracker/new` (add a job), `/tracker/[job_id]` (job
  details, evaluation, interactions), `/login`. `/evaluator` only redirects
  old links to the tracker.
- **`stories` table** exists in the schema (title/company/competencies/story
  text — sounds like behavioral-interview accomplishment stories). Only its
  metadata is read, as extra context for evaluations; nothing writes it yet.
  Likely groundwork for the planned cover-letter generator.
- Requires an Anthropic API key (`ANTHROPIC_API_KEY`) to do anything useful
  — the evaluator is the core feature and it's Claude-powered.
- See `README.md` for setup/env vars and the roadmap (application tracking,
  RAG cover-letter generator).
