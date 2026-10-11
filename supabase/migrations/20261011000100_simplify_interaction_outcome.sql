-- Interaction outcome is now just scheduled / completed / cancelled.
-- 'passed' and 'rejected' are removed; existing rows become 'completed'
-- (the interaction happened; how it went is tracked on the job status).

update public.interactions set outcome = 'completed'
  where outcome in ('passed', 'rejected');

-- Postgres auto-named the inline check from the original create table.
alter table public.interactions drop constraint if exists interactions_outcome_check;
alter table public.interactions add constraint interactions_outcome_check
  check (outcome in ('scheduled', 'completed', 'cancelled'));
