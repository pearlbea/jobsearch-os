-- Job-tracking details for the tracker page. All nullable — a job can be
-- saved/evaluated long before any of this is known.

alter table public.jobs
  add column if not exists application_date date,
  add column if not exists contact_person text,
  -- Free text (e.g. "$150k–$180k + equity") since postings rarely agree on format.
  add column if not exists salary_range text;

-- `status` already exists; keep its default and allowed values, but allow null.
alter table public.jobs
  alter column status drop not null;
