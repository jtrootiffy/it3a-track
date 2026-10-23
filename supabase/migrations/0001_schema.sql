-- ============================================================================
-- IT3A - TRACK  |  0001_schema.sql
-- ----------------------------------------------------------------------------
-- Tables, constraints and triggers for the ₱50 organizational fee tracker.
--
-- Design notes
--   * Money is never stored. "Collected" is always paid_count * 50, computed
--     from the rows, so the total cannot drift out of sync with the roster.
--   * payment_date is owned by the database: a BEFORE trigger stamps it when a
--     student becomes paid and clears it when they are reverted to unpaid. The
--     full history of changes lives in it3a_payment_audit_log.
--   * The audit log stores student_id WITHOUT a foreign key on purpose. Audit
--     history must survive a student record being deleted.
--
-- Safe to re-run: every object uses IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Roster
-- ---------------------------------------------------------------------------
create table if not exists public.it3a_students (
  id             uuid primary key default gen_random_uuid(),
  full_name      text        not null,
  payment_status text        not null default 'unpaid',
  payment_date   timestamptz,
  remarks        text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint it3a_students_name_len
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint it3a_students_status
    check (payment_status in ('paid', 'unpaid')),
  constraint it3a_students_remarks_len
    check (char_length(remarks) <= 600),
  constraint it3a_students_payment_date_consistent
    check (
      (payment_status = 'paid'   and payment_date is not null) or
      (payment_status = 'unpaid' and payment_date is null)
    )
);

-- One record per student name. Case- and whitespace-insensitive.
create unique index if not exists it3a_students_name_unique
  on public.it3a_students (lower(btrim(full_name)));

create index if not exists it3a_students_status_idx
  on public.it3a_students (payment_status);

create index if not exists it3a_students_payment_date_idx
  on public.it3a_students (payment_date);

-- ---------------------------------------------------------------------------
-- Authorized administrators
--   Exactly two rows are provisioned at deploy time by scripts/setup-admins.mjs.
--   Access is decided by the presence of a row here, never by a client flag.
-- ---------------------------------------------------------------------------
create table if not exists public.it3a_admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text        not null,
  email      text        not null,
  full_name  text        not null,
  created_at timestamptz not null default now(),

  constraint it3a_admins_username_unique unique (username),
  constraint it3a_admins_email_unique    unique (email),
  constraint it3a_admins_username_format
    check (username ~ '^[a-z0-9._-]{3,40}$'),
  constraint it3a_admins_name_len
    check (char_length(btrim(full_name)) between 2 and 120)
);

-- ---------------------------------------------------------------------------
-- Pre-auth allowlist
--   Lets the signup-blocking trigger run BEFORE the auth user exists.
--   scripts/setup-admins.mjs inserts here first, then creates the auth user.
--   No API role can read or write this table.
-- ---------------------------------------------------------------------------
create table if not exists public.it3a_signup_allowlist (
  email      text primary key,
  username   text        not null,
  full_name  text        not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payment audit log
--   Written only by a SECURITY DEFINER trigger. No client role may insert,
--   update or delete rows here.
-- ---------------------------------------------------------------------------
create table if not exists public.it3a_payment_audit_log (
  id              bigint generated always as identity primary key,
  student_id      uuid        not null,
  student_name    text        not null,
  admin_id        uuid,
  admin_username  text,
  previous_status text,
  new_status      text        not null,
  changed_at      timestamptz not null default now(),

  constraint it3a_audit_previous_status
    check (previous_status is null or previous_status in ('paid', 'unpaid')),
  constraint it3a_audit_new_status
    check (new_status in ('paid', 'unpaid'))
);

create index if not exists it3a_audit_changed_at_idx
  on public.it3a_payment_audit_log (changed_at desc);

create index if not exists it3a_audit_student_idx
  on public.it3a_payment_audit_log (student_id);

-- ---------------------------------------------------------------------------
-- BEFORE trigger: normalize the name, own payment_date, stamp updated_at
-- ---------------------------------------------------------------------------
create or replace function public.it3a_students_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.full_name := btrim(new.full_name);

  if tg_op = 'INSERT' then
    if new.payment_status = 'paid' then
      new.payment_date := coalesce(new.payment_date, now());
    else
      new.payment_date := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE: only touch payment_date when the status actually transitions.
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    new.payment_date := coalesce(new.payment_date, now());
  elsif new.payment_status = 'unpaid' then
    new.payment_date := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists it3a_students_before_write on public.it3a_students;
create trigger it3a_students_before_write
  before insert or update on public.it3a_students
  for each row execute function public.it3a_students_before_write();

-- ---------------------------------------------------------------------------
-- AFTER trigger: append an audit row for every real payment change
--   * INSERT of an already-paid student  -> (null -> paid)
--   * UPDATE where status changed        -> (old -> new)
--   * everything else is ignored
-- SECURITY DEFINER so it can write the audit log despite that table having no
-- client-facing INSERT grant. Runs as the function owner, bypassing RLS.
-- ---------------------------------------------------------------------------
create or replace function public.it3a_log_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id       uuid := auth.uid();
  v_admin_username text;
begin
  if tg_op = 'UPDATE' and new.payment_status is not distinct from old.payment_status then
    return new;
  end if;

  if tg_op = 'INSERT' and new.payment_status <> 'paid' then
    return new;
  end if;

  select a.username into v_admin_username
  from public.it3a_admins a
  where a.id = v_admin_id;

  insert into public.it3a_payment_audit_log
    (student_id, student_name, admin_id, admin_username, previous_status, new_status)
  values
    (new.id,
     new.full_name,
     v_admin_id,
     v_admin_username,
     case when tg_op = 'INSERT' then null else old.payment_status end,
     new.payment_status);

  return new;
end;
$$;

drop trigger if exists it3a_students_audit on public.it3a_students;
create trigger it3a_students_audit
  after insert or update on public.it3a_students
  for each row execute function public.it3a_log_payment_change();

-- Trigger-only helpers must never be callable over the API.
revoke all on function public.it3a_students_before_write() from public, anon, authenticated;
revoke all on function public.it3a_log_payment_change()    from public, anon, authenticated;

notify pgrst, 'reload schema';
