@AGENTS.md

# App overview

JobFit Scorecard: a candidate pastes in a resume, then pastes in job postings to get a
Claude-generated fit evaluation (match score + technical/domain/scope
breakdown, ATS keyword scan, strengths/gaps, positioning advice). Evaluations
are saved per-user and revisitable.

- **Auth & storage**: Supabase (email/password auth via `lib/supabase/`,
  `proxy.ts` middleware refreshes the session). No SQL migrations are
  checked into the repo — the `profiles`, `jobs`, and `stories` tables live
  only in the Supabase project; their expected shape is defined in
  `types/database.ts`, which is the source of truth when working on
  anything data-related.
- **Evaluation flow**: `app/api/evaluate-job/route.ts` — strips
  EOE/boilerplate footer text from the pasted JD, pulls compact profile
  fields from Supabase, prompts Claude (`@ai-sdk/anthropic` + Vercel `ai`
  SDK) for structured output against `lib/schemas/evaluation.ts`
  (`compactEvaluationSchema` — deliberately short field names to cut
  completion tokens), then maps the compact result back to the full
  `EvaluationSummary` shape before inserting into `jobs`.
- **Pages**: `/` (dashboard/landing), `/profile` (profile form),
  `/evaluator` (submit a JD, view the evaluation card), `/login`.
- **`stories` table** exists in the schema (title/company/competencies/story
  text — sounds like behavioral-interview accomplishment stories) but isn't
  read or written anywhere yet; likely groundwork for the planned
  cover-letter generator.
- Requires an Anthropic API key (`ANTHROPIC_API_KEY`) to do anything useful
  — the evaluator is the core feature and it's Claude-powered.
- See `README.md` for setup/env vars and the roadmap (application tracking,
  RAG cover-letter generator).
