-- Whether the recruiter reached out first (vs. the candidate applying cold).
alter table public.jobs
  add column if not exists recruiter_initiated boolean not null default false;
