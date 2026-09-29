-- A resume tailored to one job. When set, evaluations of that job use it
-- instead of the profile resume; evaluations.resume_snapshot records which
-- text each evaluation actually used.
alter table public.jobs add column if not exists tailored_resume text;
