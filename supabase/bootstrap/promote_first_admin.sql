-- Promote the first TutorHub administrator.
--
-- 1. Register a normal account through the website (student signup) with the owner's email
--    and confirm the email address.
-- 2. Open Supabase Dashboard -> SQL Editor (this runs as a trusted database role).
-- 3. Replace the placeholder email below and run this statement.
--
-- promote_to_admin() cannot be called through the public API: EXECUTE is revoked from the
-- anon and authenticated roles, and browser sessions can never change their own role.
select public.promote_to_admin('owner@example.com');

-- Verify:
-- select id, email, role, is_active from public.profiles where role = 'admin';
