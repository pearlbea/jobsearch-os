-- More tracker fields on jobs, closing statuses, and an interactions table
-- for conversations/interviews once an application moves forward.

alter table public.jobs
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  -- Where the lead came from (LinkedIn, referral, company site, recruiter, ...).
  add column if not exists source text,
  add column if not exists referral_name text,
  add column if not exists notes text,
  -- Why the application ended (rejected, withdrew, ghosted, declined offer, ...).
  add column if not exists closed_reason text,
  add column if not exists work_mode text
    check (work_mode in ('remote', 'hybrid', 'onsite'));

-- Postgres auto-named the inline check from the original create table.
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('bookmarked', 'outreach_sent', 'applied', 'interviewing',
                    'offer', 'rejected', 'withdrawn', 'archived'));

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

create index if not exists interactions_job_id_idx on public.interactions (job_id);
create index if not exists interactions_user_id_idx on public.interactions (user_id);

alter table public.interactions enable row level security;

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
