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
