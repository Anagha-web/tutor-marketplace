# TutorHub — Multi-vendor Tutor Marketplace

Students find independent tutors and send booking requests. Tutors manage their own profile and requests. The platform owner runs everything from an Admin CRM.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS 4 · React Router 7 · lucide-react · Supabase (Postgres, Auth, RLS) · Vercel

## Features (v1)

- **Public site:** home (search hero, subjects, featured tutors, how it works, CTAs), tutor search with filters (subject, mode, price, experience), sorting and pagination, tutor profiles with a booking-request form, about/contact/privacy/terms, and a 404 page.
- **Accounts:** student and tutor signup/login/logout via Supabase Auth. Admins are never created by signup.
- **Student dashboard:** booking requests with status filters, cancelling pending requests, and account details.
- **Tutor panel:** edit profile and subjects, submit for review, see approval status and admin notes, accept/decline requests, mark lessons completed or cancelled, and booking history.
- **Admin CRM:** live summary counts; tutor review (approve, request changes, suspend, reactivate, edit record); student activation; subject management; booking oversight with filters, details and status changes.
- **Booking workflow:** `pending → accepted | rejected | cancelled`, `accepted → completed | cancelled`. Transitions are enforced per role in the database. Contact emails are shared only after acceptance.
- **Demo mode:** without Supabase settings, the site shows fictional sample tutors, clearly labelled, and disables sign-in. Sample data is never written to the database.

## Security model

The browser is untrusted. All authorization is enforced in Postgres:

- RLS is enabled on every table, with explicit policies for anon, students, tutors and admins (`supabase/migrations/20261022000002_security.sql`).
- Guard triggers block clients from changing their role, active flag, email, ownership, review fields or booking details, and they enforce the status transition rules.
- Signup can request only `student` or `tutor`. `admin` is impossible from the client.
- Only approved tutors with active accounts are public. Private review notes are cleared when a profile is approved.
- `promote_to_admin()` cannot be executed by the `anon` or `authenticated` roles.
- The frontend uses only the project URL and publishable key. A secret or service-role key in `VITE_*` is rejected at startup.
- The React route guards are for user experience only, not security.

## Local development

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase URL + publishable key
npm run dev                    # http://localhost:5173
```

Without `.env.local` the app runs in demo mode.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit, UI and database (RLS) tests |
| `npm run lint` | ESLint |

### Tests

- `tests/db/` applies the real migrations to an in-memory Postgres (PGlite) with a stub of Supabase's `auth` schema, roles and default grants. It then exercises the RLS policies and triggers as anon, student, tutor and admin users. It needs no Docker and never touches a hosted project.
- `tests/unit/` covers booking/approval rules, validation, search/filter logic and env checks.
- `tests/ui/` covers protected routes, login/registration, the booking form, search and filter pages, the mobile menu and page smoke tests. These tests always run in demo mode.

The PGlite stub is not identical to hosted Supabase, so run the manual checks below against a staging project before launch.

## Supabase setup (one-time, in your dashboard)

1. Create a project at https://supabase.com/dashboard.
2. **SQL Editor:** run `supabase/migrations/20261022000001_initial_schema.sql`, then `supabase/migrations/20261022000002_security.sql`, in that order. With the Supabase CLI you can instead run `supabase link` and then `supabase db push`.
3. **SQL Editor:** run `supabase/seed.sql` to add the starter subjects. It is idempotent and never overwrites existing rows.
4. **Authentication → URL Configuration:** set the Site URL to your production URL. Add `http://localhost:5173/**` and your Vercel URLs to Redirect URLs.
5. **Authentication → Providers → Email:** keep "Confirm email" on (recommended).
6. **Project Settings → API:** copy the Project URL and the publishable (anon) key into `.env.local`. Never copy the service-role/secret key.

### Create the first admin

1. Sign up on the site as a normal student using the owner's email, and confirm the email address.
2. In the **SQL Editor**, run `supabase/bootstrap/promote_first_admin.sql` after replacing the placeholder email.
3. Log out and back in. The account now opens `/admin`.

### Recommended manual RLS checks on staging

- Signed in as a student, run `supabase.from('profiles').select('*')`. It returns only your own row.
- Try `update({ role: 'admin' })` on your own profile. It is rejected.
- As tutor A, try to update tutor B's profile or bookings. 0 rows are affected.

## Deploy (after your review)

```bash
git init                       # already done if .git exists
git add .
git commit -m "TutorHub v1"
git branch -M main
git remote add origin https://github.com/<you>/tutorhub.git
git push -u origin main
```

Then in Vercel:
1. **Add New → Project →** import the GitHub repo. The Vite framework preset is detected, and `vercel.json` sets the build output and SPA rewrites.
2. **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key
3. Deploy, then add the deployment URL to Supabase's Site URL and Redirect URLs.

`vercel.json` also sets security headers, including a Content-Security-Policy that allows `*.supabase.co`. If you use a custom Supabase domain, add it to `connect-src`.

## Project structure

```
src/
  components/    UI primitives, layout, booking + profile components, ProtectedRoute
  context/       Supabase auth/session provider
  data/demo.ts   Fictional sample data (demo mode only)
  lib/           Types, validation, rules (mirroring DB), search/filter, env, errors
  pages/         Public pages, auth, student/, tutor/, admin/, info/
  services/      Supabase queries (catalog, bookings, tutor account, admin)
supabase/
  migrations/    Schema + security (RLS, triggers, RPCs)
  seed.sql       Starter subjects
  bootstrap/     First-admin promotion script
tests/           db/ (RLS on PGlite), unit/, ui/
```

## Known limitations and next steps

- There is no availability calendar: a requested time is not guaranteed until the tutor accepts.
- There are no payments or commissions.
- Profile photos are https URLs; there is no Storage upload yet.
- Qualifications are self-reported and not verified.
- Deactivated users can still sign in, but they see a deactivated notice and the database blocks their actions. A full auth ban needs the service role from a trusted server.
- There is no rate limiting on booking requests yet. Consider Supabase Auth CAPTCHA and a per-student daily limit.
- If a user changes their email in Supabase Auth, `profiles.email` is not re-synced.
- Before launch, replace the placeholder contact details in `src/config/site.ts`, the currency (default USD), and the template legal pages.
