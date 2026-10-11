-- Adds 'outreach' to the allowed interaction kinds.

-- Postgres auto-named the inline check from the original create table.
alter table public.interactions drop constraint if exists interactions_kind_check;
alter table public.interactions add constraint interactions_kind_check
  check (kind in ('outreach', 'recruiter_screen', 'hiring_manager', 'technical',
                  'panel', 'take_home', 'onsite', 'offer_call', 'email', 'other'));
