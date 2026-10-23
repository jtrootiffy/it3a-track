-- ============================================================================
-- IT3A - TRACK  |  0003_signup_lockdown.sql
-- ----------------------------------------------------------------------------
-- Defence in depth against self-registration.
--
-- Supabase's "Allow new users to sign up" toggle is the primary switch and MUST
-- also be turned off in the dashboard (Authentication -> Sign In / Providers).
-- This trigger makes the rule hold at the database level too: a new auth user
-- can only be created if their email was pre-approved in it3a_signup_allowlist.
--
-- scripts/setup-admins.mjs inserts the two administrator emails into the
-- allowlist BEFORE creating their auth users, so provisioning still works.
--
-- NOTE: this trigger applies to the whole auth.users table of the project. Only
-- run it on a project dedicated to IT3A - TRACK.
-- ============================================================================

create or replace function public.it3a_block_unauthorized_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.it3a_signup_allowlist a
    where lower(a.email) = lower(new.email)
  ) then
    raise exception 'Public registration is disabled for this application.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

revoke all on function public.it3a_block_unauthorized_signup() from public, anon, authenticated;

drop trigger if exists it3a_block_signup on auth.users;
create trigger it3a_block_signup
  before insert on auth.users
  for each row execute function public.it3a_block_unauthorized_signup();

-- Belt and braces: make sure the provider-side confirmation flow cannot be
-- used to mint an account without a password.
notify pgrst, 'reload schema';
