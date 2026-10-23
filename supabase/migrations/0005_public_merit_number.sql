-- ============================================================================
-- IT3A - TRACK  |  0005_public_merit_number.sql
-- ----------------------------------------------------------------------------
-- The merit number is meant to be visible on the public leaderboard, so paid
-- students can confirm the card number recorded for them.
--
-- This only widens the anon column grant by one column. Row access is still
-- restricted by the existing policy: anon sees paid rows only. Unpaid rows can
-- never hold a merit number, so nothing private is exposed.
--
-- Safe to re-run.
-- ============================================================================

grant select (merit_number) on public.it3a_students to anon;

notify pgrst, 'reload schema';
