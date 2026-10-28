-- TutorHub initial schema: tables, enums, constraints and indexes.
-- Security (RLS, policies, guard triggers) lives in the next migration.

create type public.user_role as enum ('student', 'tutor', 'admin');
create type public.tutor_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.teaching_mode as enum ('online', 'in_person', 'both');
create type public.booking_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed');

-- One row per authenticated user. Created by a trigger on auth.users, never by the client.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text,
  phone text check (phone is null or char_length(phone) <= 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  description text check (description is null or char_length(description) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 3000),
  qualifications text not null default '' check (char_length(qualifications) <= 1500),
  experience_years integer not null default 0 check (experience_years between 0 and 60),
  hourly_rate numeric(10, 2) check (hourly_rate is null or (hourly_rate > 0 and hourly_rate <= 1000)),
  teaching_mode public.teaching_mode not null default 'online',
  location text not null default '' check (char_length(location) <= 120),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  status public.tutor_status not null default 'draft',
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tutor_profiles_status_idx on public.tutor_profiles (status);
create index tutor_profiles_rate_idx on public.tutor_profiles (hourly_rate);

create table public.tutor_subjects (
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (tutor_id, subject_id)
);
create index tutor_subjects_subject_idx on public.tutor_subjects (subject_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  requested_date date not null,
  requested_time time not null,
  message text check (message is null or char_length(message) <= 1000),
  status public.booking_status not null default 'pending',
  status_note text check (status_note is null or char_length(status_note) <= 500),
  -- Display-name snapshots set by trigger so each party can see who the booking is with
  -- without being granted read access to the other party's private profile row.
  student_name text not null default '',
  tutor_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_student_idx on public.bookings (student_id, created_at desc);
create index bookings_tutor_idx on public.bookings (tutor_id, created_at desc);
create index bookings_status_idx on public.bookings (status);
create index bookings_subject_idx on public.bookings (subject_id);

-- Keep updated_at current on every table that has it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger tutor_profiles_updated_at before update on public.tutor_profiles
  for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
