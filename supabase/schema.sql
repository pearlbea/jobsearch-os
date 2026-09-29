-- The full current schema for JobFit Scorecard. Paste it into a fresh
-- Supabase project's SQL Editor to create the database; re-running it is safe.
--
-- Hand-maintained: every change in supabase/migrations/ must be made here too
-- (and in types/database.ts). supabase/schema.test.ts checks the columns
-- against the types.
--
-- The app's server/browser Supabase clients always run as the logged-in
-- user (no service-role key in app code), and every query already filters
-- by user_id/id explicitly in application code. RLS below is defense in
-- depth, not the only thing standing between users and each other's rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  resume text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  company text,
  competencies text[],
  story_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  location text,
  job_url text,
  raw_description text,
  status text default 'bookmarked'
    check (status in ('bookmarked', 'outreach_sent', 'applied', 'interviewing',
                      'offer', 'rejected', 'withdrawn', 'archived')),
  application_date date,
  contact_person text,
  salary_range text,
  recruiter_initiated boolean not null default false,
  next_action text,
  next_action_date date,
  source text,
  referral_name text,
  notes text,
  closed_reason text,
  work_mode text check (work_mode in ('remote', 'hybrid', 'onsite')),
  tailored_resume text,
  -- Denormalized snapshot of the latest row in `evaluations` for this job —
  -- see the comment on Job.match_score/evaluation_summary in types/database.ts.
  match_score int,
  evaluation_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Columns added after the initial snapshot (see supabase/migrations/), so
-- re-running this file against an existing project picks them up too.
alter table public.jobs
  add column if not exists application_date date,
  add column if not exists contact_person text,
  add column if not exists salary_range text,
  add column if not exists recruiter_initiated boolean not null default false,
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  add column if not exists source text,
  add column if not exists referral_name text,
  add column if not exists notes text,
  add column if not exists closed_reason text,
  add column if not exists work_mode text
    check (work_mode in ('remote', 'hybrid', 'onsite')),
  add column if not exists tailored_resume text;
alter table public.jobs alter column status drop not null;
alter table public.jobs alter column raw_description drop not null;
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('bookmarked', 'outreach_sent', 'applied', 'interviewing',
                    'offer', 'rejected', 'withdrawn', 'archived'));

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  match_score int not null,
  evaluation_summary jsonb not null,
  resume_snapshot text,
  created_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'recruiter_screen', 'hiring_manager', 'technical', 'panel',
    'take_home', 'onsite', 'offer_call', 'email', 'other')),
  -- Null = not scheduled yet; future timestamps = upcoming.
  occurred_at timestamptz,
  interviewer_names text[],
  outcome text check (outcome in ('scheduled', 'completed', 'passed', 'rejected', 'cancelled')),
  notes text,
  -- Which `stories` were used. Not FK-enforced (Postgres can't on arrays).
  story_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists stories_user_id_idx on public.stories (user_id);
create index if not exists evaluations_job_id_idx on public.evaluations (job_id);
create index if not exists evaluations_user_id_idx on public.evaluations (user_id);
create index if not exists interactions_job_id_idx on public.interactions (job_id);
create index if not exists interactions_user_id_idx on public.interactions (user_id);

-- Enforce the per-user evaluation limit in the database. Must match
-- MAX_EVALUATIONS_PER_USER in lib/evaluation-engine.ts (the API checks it
-- first to avoid spending tokens; this is the enforcement that can't race).
create or replace function public.enforce_evaluation_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Serialize inserts per user for the rest of the transaction, so two
  -- concurrent inserts can't both count 4 and both get in.
  perform pg_advisory_xact_lock(hashtextextended('evaluations:' || new.user_id::text, 0));
  if (select count(*) from public.evaluations where user_id = new.user_id) >= 5 then
    raise exception 'evaluation limit reached'
      using errcode = 'EVLIM',
            hint = 'Each user can run at most 5 evaluations.';
  end if;
  return new;
end;
$$;

drop trigger if exists evaluations_enforce_limit on public.evaluations;
create trigger evaluations_enforce_limit
  before insert on public.evaluations
  for each row execute function public.enforce_evaluation_limit();

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.jobs enable row level security;
alter table public.evaluations enable row level security;
alter table public.interactions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "stories_select_own" on public.stories;
create policy "stories_select_own" on public.stories
  for select using (auth.uid() = user_id);
drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = user_id);
drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own" on public.stories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories
  for delete using (auth.uid() = user_id);

drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);

drop policy if exists "evaluations_select_own" on public.evaluations;
create policy "evaluations_select_own" on public.evaluations
  for select using (auth.uid() = user_id);
drop policy if exists "evaluations_insert_own" on public.evaluations;
create policy "evaluations_insert_own" on public.evaluations
  for insert with check (auth.uid() = user_id);

-- Insert/update also require the parent job to belong to the same user, so
-- an interaction can't be attached to someone else's job by id.
drop policy if exists "interactions_select_own" on public.interactions;
create policy "interactions_select_own" on public.interactions
  for select using (auth.uid() = user_id);
drop policy if exists "interactions_insert_own" on public.interactions;
create policy "interactions_insert_own" on public.interactions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
  );
drop policy if exists "interactions_update_own" on public.interactions;
create policy "interactions_update_own" on public.interactions
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
  );
drop policy if exists "interactions_delete_own" on public.interactions;
create policy "interactions_delete_own" on public.interactions
  for delete using (auth.uid() = user_id);
