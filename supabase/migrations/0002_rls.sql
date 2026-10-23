-- ============================================================================
-- IT3A - TRACK  |  0002_rls.sql
-- ----------------------------------------------------------------------------
-- Row Level Security. This file is the real access-control boundary; the UI is
-- only a convenience layer on top of it.
--
--   anon            -> may read PAID students only, and only public columns
--                      (never remarks, never unpaid rows, never the roster size)
--   authenticated   -> full CRUD on the roster, but ONLY if the signed-in user
--                      has a row in it3a_admins. Everyone else gets nothing.
--   authenticated   -> may read the payment audit log, admins only
--   nobody          -> may write the audit log or the allowlist
--
-- Column-level grants matter here: PostgREST refuses a request that names a
-- column the role has no SELECT privilege on, so "select=remarks" from the
-- public cannot succeed even for a paid student.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Admin predicate
--   SECURITY DEFINER so evaluating the policy does not recurse into the RLS
--   policies of it3a_admins itself.
-- ---------------------------------------------------------------------------
create or replace function public.it3a_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.it3a_admins a
    where a.id = auth.uid()
  );
$$;

revoke all on function public.it3a_is_admin() from public, anon;
grant execute on function public.it3a_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- it3a_students
-- ---------------------------------------------------------------------------
alter table public.it3a_students enable row level security;

revoke all on public.it3a_students from anon, authenticated;

-- Public surface: paid rows, public columns only.
grant select (id, full_name, payment_status, payment_date, created_at)
  on public.it3a_students to anon;

-- Signed-in surface: full columns; row access is filtered by the policies below.
grant select, insert, update, delete on public.it3a_students to authenticated;

drop policy if exists it3a_students_public_paid on public.it3a_students;
create policy it3a_students_public_paid
  on public.it3a_students
  for select
  to anon
  using (payment_status = 'paid');

drop policy if exists it3a_students_admin_all on public.it3a_students;
create policy it3a_students_admin_all
  on public.it3a_students
  for all
  to authenticated
  using (public.it3a_is_admin())
  with check (public.it3a_is_admin());

-- ---------------------------------------------------------------------------
-- it3a_admins
--   An admin may read their own row (used for the dashboard header). No client
--   role can ever insert, update or delete here; provisioning happens with the
--   service-role key from a trusted server-side script.
-- ---------------------------------------------------------------------------
alter table public.it3a_admins enable row level security;

revoke all on public.it3a_admins from anon, authenticated;
grant select (id, username, full_name) on public.it3a_admins to authenticated;

drop policy if exists it3a_admins_self_read on public.it3a_admins;
create policy it3a_admins_self_read
  on public.it3a_admins
  for select
  to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- it3a_payment_audit_log
--   Read-only for admins. Writes come exclusively from the SECURITY DEFINER
--   trigger in 0001, which bypasses these policies.
-- ---------------------------------------------------------------------------
alter table public.it3a_payment_audit_log enable row level security;

revoke all on public.it3a_payment_audit_log from anon, authenticated;
grant select on public.it3a_payment_audit_log to authenticated;

drop policy if exists it3a_audit_admin_read on public.it3a_payment_audit_log;
create policy it3a_audit_admin_read
  on public.it3a_payment_audit_log
  for select
  to authenticated
  using (public.it3a_is_admin());

-- ---------------------------------------------------------------------------
-- it3a_signup_allowlist
--   Service-role only. No grants to anon or authenticated at all.
-- ---------------------------------------------------------------------------
alter table public.it3a_signup_allowlist enable row level security;
revoke all on public.it3a_signup_allowlist from anon, authenticated;

notify pgrst, 'reload schema';
