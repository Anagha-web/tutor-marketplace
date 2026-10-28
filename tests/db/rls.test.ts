// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestDb } from './harness';

const BIO = 'Experienced maths tutor who loves helping students build confidence step by step.';

async function fixture() {
  const db = await TestDb.create();
  const admin = await db.signUp('admin@test.local', { role: 'student', full_name: 'Ada Admin' });
  await db.trusted(`select public.promote_to_admin('admin@test.local')`);
  const student1 = await db.signUp('s1@test.local', { role: 'student', full_name: 'Sam Student' });
  const student2 = await db.signUp('s2@test.local', { role: 'student', full_name: 'Sky Student' });
  const tutorA = await db.signUp('ta@test.local', { role: 'tutor', full_name: 'Tara Tutor' });
  const tutorB = await db.signUp('tb@test.local', { role: 'tutor', full_name: 'Theo Tutor' });
  const tpA = await db.tutorProfileId(tutorA);
  const tpB = await db.tutorProfileId(tutorB);
  const math = await db.subjectId('mathematics');
  const physics = await db.subjectId('physics');

  // Tutor A completes their profile, submits it, and an admin approves it.
  await db.as(
    tutorA,
    `update public.tutor_profiles set bio = $1, hourly_rate = 40, experience_years = 6,
       teaching_mode = 'online', headline = 'Patient GCSE & A-level maths' where id = $2`,
    [BIO, tpA],
  );
  await db.as(tutorA, 'insert into public.tutor_subjects (tutor_id, subject_id) values ($1, $2)', [tpA, math]);
  await db.as(tutorA, `update public.tutor_profiles set status = 'pending' where id = $1`, [tpA]);
  await db.as(admin, `update public.tutor_profiles set status = 'approved' where id = $1`, [tpA]);

  const book = (studentId: string, dateExpr = 'current_date + 7', subject = math, tutor = tpA) =>
    db.as<{ id: string; status: string; student_name: string; tutor_name: string }>(
      studentId,
      `insert into public.bookings (student_id, tutor_id, subject_id, requested_date, requested_time, message)
       values ($1, $2, $3, ${dateExpr}, '16:00', 'Help with algebra') returning *`,
      [studentId, tutor, subject],
    );

  return { db, admin, student1, student2, tutorA, tutorB, tpA, tpB, math, physics, book };
}

type Fx = Awaited<ReturnType<typeof fixture>>;

describe('signup and role management', () => {
  let f: Fx;
  beforeAll(async () => (f = await fixture()));
  afterAll(() => f.db.close());

  it('creates profiles with the requested student/tutor role and a draft tutor profile', async () => {
    const rows = await f.db.trusted(`select role from public.profiles where id = $1`, [f.tutorA]);
    expect(rows[0].role).toBe('tutor');
    const tp = await f.db.trusted(`select status from public.tutor_profiles where id = $1`, [f.tpB]);
    expect(tp[0].status).toBe('draft');
  });

  it('never grants admin through signup metadata', async () => {
    const id = await f.db.signUp('sneaky@test.local', { role: 'admin' });
    const rows = await f.db.trusted(`select role from public.profiles where id = $1`, [id]);
    expect(rows[0].role).toBe('student');
  });

  it('prevents users changing their own role or active flag', async () => {
    await expect(
      f.db.as(f.student1, `update public.profiles set role = 'admin' where id = $1`, [f.student1]),
    ).rejects.toThrow(/cannot be changed/);
    await expect(
      f.db.as(f.student1, `update public.profiles set is_active = false where id = $1`, [f.student1]),
    ).rejects.toThrow(/Only administrators/);
  });

  it('lets users update their own name but not other profiles', async () => {
    await f.db.as(f.student1, `update public.profiles set full_name = 'Sam S.' where id = $1`, [f.student1]);
    const other = await f.db.as(f.student1, `update public.profiles set full_name = 'x' where id = $1 returning id`, [f.student2]);
    expect(other).toHaveLength(0);
    const rows = await f.db.trusted(`select full_name from public.profiles where id = $1`, [f.student2]);
    expect(rows[0].full_name).toBe('Sky Student');
  });

  it('hides other users profiles from students and anon', async () => {
    const rows = await f.db.as(f.student1, 'select id from public.profiles');
    expect(rows.map((r) => r.id)).toEqual([f.student1]);
    await expect(f.db.as(null, 'select id from public.profiles')).rejects.toThrow(/permission denied/);
    await expect(f.db.as(null, 'select id from public.bookings')).rejects.toThrow(/permission denied/);
  });

  it('lets admins read all profiles and deactivate others, but not themselves', async () => {
    const rows = await f.db.as(f.admin, 'select id from public.profiles');
    expect(rows.length).toBeGreaterThanOrEqual(5);
    await expect(
      f.db.as(f.admin, `update public.profiles set is_active = false where id = $1`, [f.admin]),
    ).rejects.toThrow(/own account/);
    await expect(
      f.db.as(f.admin, `update public.profiles set role = 'tutor' where id = $1`, [f.student2]),
    ).rejects.toThrow(/cannot be changed/);
  });

  it('only lets trusted contexts call promote_to_admin', async () => {
    await expect(
      f.db.as(f.student1, `select public.promote_to_admin('s1@test.local')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('tutor approval and public visibility', () => {
  let f: Fx;
  beforeAll(async () => (f = await fixture()));
  afterAll(() => f.db.close());

  it('shows approved tutors publicly but hides drafts', async () => {
    const rows = await f.db.as(null, 'select id from public.tutor_profiles');
    expect(rows.map((r) => r.id)).toEqual([f.tpA]);
  });

  it('lets tutors see their own unapproved profile', async () => {
    const rows = await f.db.as(f.tutorB, 'select id, status from public.tutor_profiles where id = $1', [f.tpB]);
    expect(rows[0].status).toBe('draft');
  });

  it('rejects incomplete submissions', async () => {
    await expect(
      f.db.as(f.tutorB, `update public.tutor_profiles set status = 'pending' where id = $1`, [f.tpB]),
    ).rejects.toThrow(/before submitting/);
  });

  it('prevents tutors approving themselves or editing review fields', async () => {
    await f.db.as(f.tutorB, `update public.tutor_profiles set bio = $1, hourly_rate = 30 where id = $2`, [BIO, f.tpB]);
    await f.db.as(f.tutorB, 'insert into public.tutor_subjects values ($1, $2)', [f.tpB, f.physics]);
    await expect(
      f.db.as(f.tutorB, `update public.tutor_profiles set status = 'approved' where id = $1`, [f.tpB]),
    ).rejects.toThrow(/cannot change from draft to approved/);
    await expect(
      f.db.as(f.tutorB, `update public.tutor_profiles set admin_note = 'ok' where id = $1`, [f.tpB]),
    ).rejects.toThrow(/administrators/);
    await f.db.as(f.tutorB, `update public.tutor_profiles set status = 'pending' where id = $1`, [f.tpB]);
    await expect(
      f.db.as(f.tutorB, `update public.tutor_profiles set status = 'approved' where id = $1`, [f.tpB]),
    ).rejects.toThrow(/cannot change from pending to approved/);
  });

  it('prevents tutors editing another tutor or their subjects', async () => {
    const res = await f.db.as(f.tutorB, `update public.tutor_profiles set bio = 'hacked' where id = $1 returning id`, [f.tpA]);
    expect(res).toHaveLength(0);
    await expect(
      f.db.as(f.tutorB, 'insert into public.tutor_subjects values ($1, $2)', [f.tpA, f.physics]),
    ).rejects.toThrow(/row-level security/);
    const del = await f.db.as(f.tutorB, 'delete from public.tutor_subjects where tutor_id = $1 returning tutor_id', [f.tpA]);
    expect(del).toHaveLength(0);
  });

  it('lets admins approve, suspend and reactivate tutors', async () => {
    await f.db.as(f.admin, `update public.tutor_profiles set status = 'approved' where id = $1`, [f.tpB]);
    let pub = await f.db.as(null, 'select id from public.tutor_profiles order by display_name');
    expect(pub.map((r) => r.id).sort()).toEqual([f.tpA, f.tpB].sort());

    await f.db.as(f.admin, `update public.tutor_profiles set status = 'suspended', admin_note = 'Review' where id = $1`, [f.tpB]);
    pub = await f.db.as(null, 'select id from public.tutor_profiles');
    expect(pub.map((r) => r.id)).toEqual([f.tpA]);

    await f.db.as(f.admin, `update public.tutor_profiles set status = 'approved' where id = $1`, [f.tpB]);
    pub = await f.db.as(null, 'select id from public.tutor_profiles');
    expect(pub).toHaveLength(2);
  });

  it('never exposes private review notes on approved (public) profiles', async () => {
    await f.db.as(f.admin, `update public.tutor_profiles set status = 'suspended', admin_note = 'Private reason' where id = $1`, [f.tpB]);
    await f.db.as(f.admin, `update public.tutor_profiles set status = 'approved', admin_note = 'Still private' where id = $1`, [f.tpB]);
    const rows = await f.db.as(null, 'select admin_note from public.tutor_profiles where id = $1', [f.tpB]);
    expect(rows[0].admin_note).toBeNull();
  });

  it('hides approved tutors whose account is deactivated and blocks their edits', async () => {
    await f.db.as(f.admin, 'update public.profiles set is_active = false where id = $1', [f.tutorB]);
    const pub = await f.db.as(null, 'select id from public.tutor_profiles');
    expect(pub.map((r) => r.id)).toEqual([f.tpA]);
    const upd = await f.db.as(f.tutorB, `update public.tutor_profiles set bio = 'x' where id = $1 returning id`, [f.tpB]);
    expect(upd).toHaveLength(0);
  });

  it('only allows admins to manage subjects', async () => {
    await expect(
      f.db.as(f.tutorA, `insert into public.subjects (name, slug) values ('Latin', 'latin')`),
    ).rejects.toThrow(/row-level security/);
    await f.db.as(f.admin, `insert into public.subjects (name, slug) values ('Latin', 'latin')`);
    const res = await f.db.as(f.student1, `update public.subjects set is_active = false where slug = 'latin' returning id`);
    expect(res).toHaveLength(0);
    await f.db.as(f.admin, `update public.subjects set is_active = false where slug = 'latin'`);
  });
});

describe('booking workflow', () => {
  let f: Fx;
  beforeAll(async () => (f = await fixture()));
  afterAll(() => f.db.close());

  it('creates a pending booking with server-side name snapshots', async () => {
    const [b] = await f.book(f.student1);
    expect(b.status).toBe('pending');
    expect(b.student_name).toBe('Sam Student');
    expect(b.tutor_name).toBe('Tara Tutor');
  });

  it('ignores a client-supplied status', async () => {
    const [b] = await f.db.as<{ status: string }>(
      f.student1,
      `insert into public.bookings (student_id, tutor_id, subject_id, requested_date, requested_time, status)
       values ($1, $2, $3, current_date + 2, '09:00', 'accepted') returning status`,
      [f.student1, f.tpA, f.math],
    );
    expect(b.status).toBe('pending');
  });

  it('rejects past dates, untaught subjects, unapproved tutors and other students ids', async () => {
    await expect(f.book(f.student1, 'current_date - 3')).rejects.toThrow(/past/);
    await expect(f.book(f.student1, 'current_date + 400')).rejects.toThrow(/12 months/);
    await expect(f.book(f.student1, 'current_date + 1', f.physics)).rejects.toThrow(/does not teach/);
    await expect(f.book(f.student1, 'current_date + 1', f.math, f.tpB)).rejects.toThrow(/not currently accepting/);
    await expect(
      f.db.as(
        f.student1,
        `insert into public.bookings (student_id, tutor_id, subject_id, requested_date, requested_time)
         values ($1, $2, $3, current_date + 1, '10:00')`,
        [f.student2, f.tpA, f.math],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('does not let tutors or admins create bookings as students', async () => {
    await expect(f.book(f.tutorB)).rejects.toThrow(/row-level security/);
    await expect(f.book(f.admin)).rejects.toThrow(/row-level security/);
  });

  it('isolates bookings between students and between tutors', async () => {
    await f.book(f.student2);
    const s1 = await f.db.as(f.student1, 'select student_id from public.bookings');
    expect(s1.every((r) => r.student_id === f.student1)).toBe(true);
    const tB = await f.db.as(f.tutorB, 'select id from public.bookings');
    expect(tB).toHaveLength(0);
    const tA = await f.db.as(f.tutorA, 'select id from public.bookings');
    expect(tA.length).toBe(3);
    const upd = await f.db.as(f.student2, `update public.bookings set status = 'cancelled' where student_id = $1 returning id`, [f.student1]);
    expect(upd).toHaveLength(0);
    const tupd = await f.db.as(f.tutorB, `update public.bookings set status = 'rejected' returning id`);
    expect(tupd).toHaveLength(0);
  });

  it('enforces role-based status transitions', async () => {
    const [b] = await f.book(f.student1);
    await expect(
      f.db.as(f.student1, `update public.bookings set status = 'accepted' where id = $1`, [b.id]),
    ).rejects.toThrow(/cannot change from pending to accepted/);
    await f.db.as(f.tutorA, `update public.bookings set status = 'accepted', status_note = 'See you then' where id = $1`, [b.id]);
    await expect(
      f.db.as(f.student1, `update public.bookings set status = 'cancelled' where id = $1`, [b.id]),
    ).rejects.toThrow(/cannot change from accepted to cancelled/);
    await expect(
      f.db.as(f.tutorA, `update public.bookings set status = 'completed' where id = $1`, [b.id]),
    ).rejects.toThrow(/on or after its requested date/);
    await f.db.as(f.tutorA, `update public.bookings set status = 'cancelled' where id = $1`, [b.id]);
    await expect(
      f.db.as(f.admin, `update public.bookings set status = 'accepted' where id = $1`, [b.id]),
    ).rejects.toThrow(/cannot change from cancelled to accepted/);
  });

  it('lets students cancel their own pending bookings only', async () => {
    const [b] = await f.book(f.student1);
    await f.db.as(f.student1, `update public.bookings set status = 'cancelled' where id = $1`, [b.id]);
    const [c] = await f.book(f.student1);
    await expect(
      f.db.as(f.student1, `update public.bookings set status_note = 'hi' where id = $1`, [c.id]),
    ).rejects.toThrow(/response note/);
  });

  it('lets tutors complete bookings on or after the requested date', async () => {
    const [b] = await f.book(f.student1, 'current_date');
    await f.db.as(f.tutorA, `update public.bookings set status = 'accepted' where id = $1`, [b.id]);
    await f.db.as(f.tutorA, `update public.bookings set status = 'completed' where id = $1`, [b.id]);
    const rows = await f.db.as(f.student1, 'select status from public.bookings where id = $1', [b.id]);
    expect(rows[0].status).toBe('completed');
  });

  it('prevents editing booking details after submission', async () => {
    const [b] = await f.book(f.student1);
    await expect(
      f.db.as(f.student1, `update public.bookings set requested_date = current_date + 30 where id = $1`, [b.id]),
    ).rejects.toThrow(/cannot be changed/);
    await expect(
      f.db.as(f.tutorA, `update public.bookings set tutor_id = $2 where id = $1`, [b.id, f.tpB]),
    ).rejects.toThrow(/cannot be changed/);
  });

  it('shares contact emails only after acceptance and only with the parties', async () => {
    const [b] = await f.book(f.student1);
    expect(await f.db.as(f.student1, 'select * from public.get_booking_contacts($1)', [b.id])).toHaveLength(0);
    await f.db.as(f.tutorA, `update public.bookings set status = 'accepted' where id = $1`, [b.id]);
    const [c] = await f.db.as(f.student1, 'select * from public.get_booking_contacts($1)', [b.id]);
    expect(c).toEqual({ student_email: 's1@test.local', tutor_email: 'ta@test.local' });
    expect(await f.db.as(f.student2, 'select * from public.get_booking_contacts($1)', [b.id])).toHaveLength(0);
    expect(await f.db.as(f.tutorB, 'select * from public.get_booking_contacts($1)', [b.id])).toHaveLength(0);
  });

  it('lets admins see all bookings and blocks deactivated students', async () => {
    const all = await f.db.as(f.admin, 'select id from public.bookings');
    const total = await f.db.trusted('select id from public.bookings');
    expect(all.length).toBe(total.length);
    await f.db.as(f.admin, 'update public.profiles set is_active = false where id = $1', [f.student2]);
    await expect(f.book(f.student2)).rejects.toThrow(/row-level security/);
  });
});

describe('search_tutors', () => {
  let f: Fx;
  beforeAll(async () => {
    f = await fixture();
    // Tutor B: in-person physics tutor, approved.
    await f.db.as(
      f.tutorB,
      `update public.tutor_profiles set bio = $1, hourly_rate = 25, experience_years = 2,
         teaching_mode = 'in_person', location = 'Leeds' where id = $2`,
      [BIO.replace('maths', 'physics'), f.tpB],
    );
    await f.db.as(f.tutorB, 'insert into public.tutor_subjects values ($1, $2)', [f.tpB, f.physics]);
    await f.db.as(f.tutorB, `update public.tutor_profiles set status = 'pending' where id = $1`, [f.tpB]);
    await f.db.as(f.admin, `update public.tutor_profiles set status = 'approved' where id = $1`, [f.tpB]);
  });
  afterAll(() => f.db.close());

  const search = (args: string) =>
    f.db.as<{ id: string; total_count: string; subjects: { slug: string }[] }>(null, `select * from public.search_tutors(${args})`);

  it('returns approved tutors with subjects and a total count', async () => {
    const rows = await search('');
    expect(rows).toHaveLength(2);
    expect(Number(rows[0].total_count)).toBe(2);
    expect(rows.find((r) => r.id === f.tpA)?.subjects.map((s) => s.slug)).toEqual(['mathematics']);
  });

  it('filters by subject, mode, price and experience', async () => {
    expect((await search(`p_subject_slug => 'physics'`)).map((r) => r.id)).toEqual([f.tpB]);
    expect((await search(`p_mode => 'online'`)).map((r) => r.id)).toEqual([f.tpA]);
    expect((await search(`p_max_rate => 30`)).map((r) => r.id)).toEqual([f.tpB]);
    expect((await search(`p_min_experience => 5`)).map((r) => r.id)).toEqual([f.tpA]);
  });

  it('searches by keyword (including subject names) and treats wildcards literally', async () => {
    expect((await search(`p_query => 'tara'`)).map((r) => r.id)).toEqual([f.tpA]);
    expect((await search(`p_query => 'Physics'`)).map((r) => r.id)).toEqual([f.tpB]);
    expect(await search(`p_query => '%'`)).toHaveLength(0);
  });

  it('sorts and paginates', async () => {
    expect((await search(`p_sort => 'price_asc'`)).map((r) => r.id)).toEqual([f.tpB, f.tpA]);
    expect((await search(`p_sort => 'price_desc'`)).map((r) => r.id)).toEqual([f.tpA, f.tpB]);
    const page2 = await search(`p_limit => 1, p_offset => 1`);
    expect(page2).toHaveLength(1);
    expect(Number(page2[0].total_count)).toBe(2);
  });

  it('excludes the caller’s own unapproved profile from search', async () => {
    await f.db.as(f.admin, `update public.tutor_profiles set status = 'suspended' where id = $1`, [f.tpB]);
    const rows = await f.db.as(f.tutorB, 'select id from public.search_tutors()');
    expect(rows.map((r) => r.id)).toEqual([f.tpA]);
  });
});
