-- Jobs can now be created on the tracker before there's a posting to paste in
-- (e.g. a recruiter reached out first). The description is added later, when
-- the job is evaluated.
alter table public.jobs alter column raw_description drop not null;
