-- ============================================================================
-- IT3A - TRACK  |  0004_merit_number.sql
-- ----------------------------------------------------------------------------
-- Optional merit number recorded when a student pays.
--
-- Rules
--   * A merit number is optional. A paid student may have one or none.
--   * Only a paid student may carry one. The check constraint enforces it, and
--     the BEFORE trigger clears it whenever a student becomes unpaid, so the
--     rule holds for every write path (app, CSV import, manual SQL).
--   * Merit numbers are administrator-only. The anon column grants in 0002 are
--     unchanged, so the public page cannot read this column.
--
-- Safe to re-run: every object uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- ============================================================================

alter table public.it3a_students
  add column if not exists merit_number text;

-- ---------------------------------------------------------------------------
-- Replace the BEFORE trigger so the column is normalized and cleared on revert.
-- ---------------------------------------------------------------------------
create or replace function public.it3a_students_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.full_name := btrim(new.full_name);
  new.merit_number := nullif(btrim(coalesce(new.merit_number, '')), '');

  if tg_op = 'INSERT' then
    if new.payment_status = 'paid' then
      new.payment_date := coalesce(new.payment_date, now());
    else
      new.payment_date := null;
      new.merit_number := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE: only touch payment_date when the status actually transitions.
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    new.payment_date := coalesce(new.payment_date, now());
  elsif new.payment_status = 'unpaid' then
    new.payment_date := null;
    new.merit_number := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.it3a_students_before_write() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
alter table public.it3a_students
  drop constraint if exists it3a_students_merit_requires_paid;

alter table public.it3a_students
  add constraint it3a_students_merit_requires_paid
  check (
    merit_number is null
    or (payment_status = 'paid' and btrim(merit_number) <> '')
  );

alter table public.it3a_students
  drop constraint if exists it3a_students_merit_number_len;

alter table public.it3a_students
  add constraint it3a_students_merit_number_len
  check (merit_number is null or char_length(merit_number) between 1 and 40);

notify pgrst, 'reload schema';
