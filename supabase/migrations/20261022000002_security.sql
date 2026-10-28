-- TutorHub security: helper functions, signup trigger, guard triggers, RLS policies, grants.
--
-- Trust model
--   * Requests from the browser run as the `anon` or `authenticated` database role.
--     Everything they do is constrained by RLS policies plus the guard triggers below.
--   * Anything else (Supabase SQL editor, service role on a trusted server) is treated
--     as trusted and bypasses the field/transition guards. RLS remains enabled.
--   * Role, active flag and approval status are never accepted from the client.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies can consult profiles without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Role of the calling user, or null when signed out or deactivated.
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_active from public.profiles where id = p_user_id), false);
$$;

-- Tutor profile id owned by the calling (active) user, if any.
create or replace function public.my_tutor_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tp.id
  from public.tutor_profiles tp
  join public.profiles p on p.id = tp.user_id
  where tp.user_id = auth.uid() and p.is_active;
$$;

-- True when the current statement comes from the public API roles rather than a trusted context.
create or replace function public.is_client_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

-- Allowed booking status transitions per actor. Mirrored in src/lib/bookingRules.ts.
create or replace function public.booking_transition_allowed(
  p_actor text,
  p_from public.booking_status,
  p_to public.booking_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_actor
    when 'student' then p_from = 'pending' and p_to = 'cancelled'
    when 'tutor' then (p_from = 'pending' and p_to in ('accepted', 'rejected'))
                   or (p_from = 'accepted' and p_to in ('completed', 'cancelled'))
    when 'admin' then (p_from = 'pending' and p_to in ('accepted', 'rejected', 'cancelled'))
                   or (p_from = 'accepted' and p_to in ('completed', 'cancelled'))
    else false
  end;
$$;

-- Allowed tutor profile status transitions per actor. Mirrored in src/lib/tutorRules.ts.
create or replace function public.tutor_status_transition_allowed(
  p_actor text,
  p_from public.tutor_status,
  p_to public.tutor_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_actor
    when 'tutor' then p_from in ('draft', 'rejected') and p_to = 'pending'
    when 'admin' then (p_from = 'pending' and p_to in ('approved', 'rejected'))
                   or (p_from = 'approved' and p_to = 'suspended')
                   or (p_from = 'suspended' and p_to = 'approved')
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Signup: create the profile (and tutor profile) for every new auth user.
-- Only 'student' or 'tutor' can be chosen at signup; anything else becomes 'student'.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_role := case new.raw_user_meta_data ->> 'role' when 'tutor' then 'tutor' else 'student' end;
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);

  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, v_name, new.email);

  if v_role = 'tutor' then
    insert into public.tutor_profiles (user_id, display_name)
    values (new.id, left(v_name, 80));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard triggers
-- ---------------------------------------------------------------------------

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'Role, email and account identifiers cannot be changed here'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    if not public.is_admin() then
      raise exception 'Only administrators can change account status' using errcode = '42501';
    end if;
    if old.id = auth.uid() then
      raise exception 'Administrators cannot deactivate their own account' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_tutor_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor text;
begin
  if not public.is_client_request() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Tutor profile ownership cannot be changed' using errcode = '42501';
  end if;

  v_actor := case when public.is_admin() then 'admin' else 'tutor' end;

  if v_actor = 'tutor' then
    if new.admin_note is distinct from old.admin_note
       or new.submitted_at is distinct from old.submitted_at
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Review fields can only be changed by administrators' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not public.tutor_status_transition_allowed(v_actor, old.status, new.status) then
      raise exception 'Profile status cannot change from % to %', old.status, new.status
        using errcode = '42501';
    end if;

    if new.status = 'pending' then
      if btrim(new.display_name) = ''
         or char_length(btrim(new.bio)) < 50
         or new.hourly_rate is null
         or not exists (select 1 from public.tutor_subjects ts where ts.tutor_id = new.id) then
        raise exception 'Complete your name, a bio of at least 50 characters, an hourly rate and at least one subject before submitting'
          using errcode = '23514';
      end if;
      new.submitted_at := now();
      new.admin_note := null;
    else
      new.reviewed_at := now();
    end if;
  end if;

  -- Approved rows are publicly readable, so they must never carry private review notes.
  if new.status = 'approved' then
    new.admin_note := null;
  end if;

  return new;
end;
$$;

create trigger tutor_profiles_guard before update on public.tutor_profiles
  for each row execute function public.guard_tutor_profile_update();

-- Booking creation: force a clean pending row and validate it against the tutor and subject.
create or replace function public.prepare_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tutor_name text;
  v_tutor_user uuid;
begin
  select tp.display_name, tp.user_id into v_tutor_name, v_tutor_user
  from public.tutor_profiles tp
  join public.profiles p on p.id = tp.user_id
  where tp.id = new.tutor_id and tp.status = 'approved' and p.is_active;

  if v_tutor_user is null then
    raise exception 'This tutor is not currently accepting requests' using errcode = '23514';
  end if;

  if v_tutor_user = new.student_id then
    raise exception 'You cannot book yourself' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.tutor_subjects ts
    join public.subjects s on s.id = ts.subject_id
    where ts.tutor_id = new.tutor_id and ts.subject_id = new.subject_id and s.is_active
  ) then
    raise exception 'This tutor does not teach the selected subject' using errcode = '23514';
  end if;

  -- Allow 12h of slack so students west of UTC can still request "today" in their local time.
  if new.requested_date < ((now() at time zone 'utc') - interval '12 hours')::date then
    raise exception 'Requested date cannot be in the past' using errcode = '23514';
  end if;
  if new.requested_date > (current_date + 365) then
    raise exception 'Requested date must be within the next 12 months' using errcode = '23514';
  end if;

  new.status := 'pending';
  new.status_note := null;
  new.tutor_name := v_tutor_name;
  new.student_name := coalesce((select full_name from public.profiles where id = new.student_id), '');
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_prepare before insert on public.bookings
  for each row execute function public.prepare_new_booking();

create or replace function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor text;
begin
  if not public.is_client_request() then
    return new;
  end if;

  if (new.id, new.student_id, new.tutor_id, new.subject_id, new.requested_date, new.requested_time,
      new.message, new.student_name, new.tutor_name, new.created_at)
     is distinct from
     (old.id, old.student_id, old.tutor_id, old.subject_id, old.requested_date, old.requested_time,
      old.message, old.student_name, old.tutor_name, old.created_at) then
    raise exception 'Booking details cannot be changed after submission' using errcode = '42501';
  end if;

  v_actor := case
    when public.is_admin() then 'admin'
    when old.tutor_id = public.my_tutor_profile_id() then 'tutor'
    when old.student_id = auth.uid() and public.is_active_user(auth.uid()) then 'student'
    else null
  end;

  if v_actor is null then
    raise exception 'Not allowed to update this booking' using errcode = '42501';
  end if;

  if v_actor = 'student' and new.status_note is distinct from old.status_note then
    raise exception 'Students cannot edit the response note' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not public.booking_transition_allowed(v_actor, old.status, new.status) then
      raise exception 'Booking cannot change from % to %', old.status, new.status
        using errcode = '42501';
    end if;
    if new.status = 'completed' and old.requested_date > current_date then
      raise exception 'A booking can only be completed on or after its requested date'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard before update on public.bookings
  for each row execute function public.guard_booking_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.bookings enable row level security;

-- profiles: private to the owner and admins.
create policy "profiles: owner or admin can read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles: owner or admin can update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- subjects: public catalogue, admin-managed.
create policy "subjects: anyone can read" on public.subjects
  for select to anon, authenticated
  using (true);
create policy "subjects: admin can insert" on public.subjects
  for insert to authenticated
  with check (public.is_admin());
create policy "subjects: admin can update" on public.subjects
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tutor_profiles: approved + active tutors are public; owners and admins see their rows.
create policy "tutor_profiles: public approved, owner or admin can read" on public.tutor_profiles
  for select to anon, authenticated
  using (
    (status = 'approved' and public.is_active_user(user_id))
    or user_id = auth.uid()
    or public.is_admin()
  );
create policy "tutor_profiles: active owner or admin can update" on public.tutor_profiles
  for update to authenticated
  using ((user_id = auth.uid() and public.is_active_user(auth.uid())) or public.is_admin())
  with check ((user_id = auth.uid() and public.is_active_user(auth.uid())) or public.is_admin());

-- tutor_subjects: visible whenever the tutor profile is visible; owner/admin manage.
create policy "tutor_subjects: readable with tutor profile" on public.tutor_subjects
  for select to anon, authenticated
  using (exists (select 1 from public.tutor_profiles tp where tp.id = tutor_id));
create policy "tutor_subjects: owner or admin can add" on public.tutor_subjects
  for insert to authenticated
  with check (
    (tutor_id = public.my_tutor_profile_id() or public.is_admin())
    and exists (select 1 from public.subjects s where s.id = subject_id and s.is_active)
  );
create policy "tutor_subjects: owner or admin can remove" on public.tutor_subjects
  for delete to authenticated
  using (tutor_id = public.my_tutor_profile_id() or public.is_admin());

-- bookings: visible to the student, the tutor and admins. Only active students create them.
create policy "bookings: parties or admin can read" on public.bookings
  for select to authenticated
  using (
    student_id = auth.uid()
    or tutor_id = public.my_tutor_profile_id()
    or public.is_admin()
  );
create policy "bookings: students can create their own" on public.bookings
  for insert to authenticated
  with check (student_id = auth.uid() and public.my_role() = 'student');
create policy "bookings: parties or admin can update" on public.bookings
  for update to authenticated
  using (
    student_id = auth.uid()
    or tutor_id = public.my_tutor_profile_id()
    or public.is_admin()
  )
  with check (
    student_id = auth.uid()
    or tutor_id = public.my_tutor_profile_id()
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.subjects, public.tutor_profiles, public.tutor_subjects, public.bookings
  from anon;
grant select on public.subjects, public.tutor_profiles, public.tutor_subjects to anon;

revoke truncate, references, trigger on public.profiles, public.subjects, public.tutor_profiles,
  public.tutor_subjects, public.bookings from authenticated;
revoke insert, delete on public.profiles, public.tutor_profiles from authenticated;
revoke delete on public.subjects, public.bookings from authenticated;

-- ---------------------------------------------------------------------------
-- RPC functions
-- ---------------------------------------------------------------------------

-- Public tutor search. SECURITY INVOKER so RLS still applies; also filters explicitly to
-- approved + active tutors so owners and admins don't see unapproved rows in search.
create or replace function public.search_tutors(
  p_query text default null,
  p_subject_slug text default null,
  p_mode public.teaching_mode default null,
  p_min_rate numeric default null,
  p_max_rate numeric default null,
  p_min_experience integer default null,
  p_sort text default 'recommended',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  headline text,
  bio text,
  qualifications text,
  experience_years integer,
  hourly_rate numeric,
  teaching_mode public.teaching_mode,
  location text,
  avatar_url text,
  subjects jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with pat as (
    -- Escape LIKE wildcards so user input is matched literally.
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  ),
  filtered as (
    select tp.*
    from public.tutor_profiles tp, pat
    where tp.status = 'approved'
      and public.is_active_user(tp.user_id)
      and (p_mode is null
           or tp.teaching_mode = p_mode
           or tp.teaching_mode = 'both')
      and (p_min_rate is null or tp.hourly_rate >= p_min_rate)
      and (p_max_rate is null or tp.hourly_rate <= p_max_rate)
      and (p_min_experience is null or tp.experience_years >= p_min_experience)
      and (p_subject_slug is null or exists (
            select 1 from public.tutor_subjects ts
            join public.subjects s on s.id = ts.subject_id
            where ts.tutor_id = tp.id and s.slug = p_subject_slug and s.is_active))
      and (nullif(btrim(p_query), '') is null or exists (
            select 1
            where tp.display_name ilike pat.p
               or tp.headline ilike pat.p
               or tp.bio ilike pat.p
               or exists (
                 select 1 from public.tutor_subjects ts
                 join public.subjects s on s.id = ts.subject_id
                 where ts.tutor_id = tp.id
                   and s.name ilike pat.p)))
  )
  select
    f.id, f.display_name, f.headline, f.bio, f.qualifications, f.experience_years,
    f.hourly_rate, f.teaching_mode, f.location, f.avatar_url,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug) order by s.name)
      from public.tutor_subjects ts
      join public.subjects s on s.id = ts.subject_id
      where ts.tutor_id = f.id and s.is_active
    ), '[]'::jsonb) as subjects,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'price_asc' then f.hourly_rate end asc nulls last,
    case when p_sort = 'price_desc' then f.hourly_rate end desc nulls last,
    case when p_sort = 'newest' then f.reviewed_at end desc nulls last,
    f.experience_years desc,
    f.display_name asc,
    f.id
  limit least(greatest(coalesce(p_limit, 12), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Contact emails for a booking: only shared once the tutor has accepted, and only with
-- the two parties (admins can always see them).
create or replace function public.get_booking_contacts(p_booking_id uuid)
returns table (student_email text, tutor_email text)
language sql
stable
security definer
set search_path = ''
as $$
  select sp.email, tu.email
  from public.bookings b
  join public.tutor_profiles tp on tp.id = b.tutor_id
  join public.profiles sp on sp.id = b.student_id
  join public.profiles tu on tu.id = tp.user_id
  where b.id = p_booking_id
    and (
      public.is_admin()
      or (b.status in ('accepted', 'completed')
          and (b.student_id = auth.uid() or tp.user_id = auth.uid()))
    );
$$;

-- Trusted-only admin bootstrap. Run from the Supabase SQL editor:
--   select public.promote_to_admin('owner@example.com');
create or replace function public.promote_to_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'No auth user with email %', p_email;
  end if;
  update public.profiles set role = 'admin', is_active = true where id = v_id;
end;
$$;

revoke execute on function public.promote_to_admin(text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prepare_new_booking() from public, anon, authenticated;
