/**
 * Admin data access. These calls only succeed for admins because the database RLS policies
 * and triggers check public.is_admin(); the admin UI being hidden is not the security control.
 */
import { sanitizeSearchTerm } from '../lib/errors';
import { requireSupabase } from '../lib/supabase';
import type { Booking, BookingStatus, Profile, Subject, TutorProfile, TutorStatus } from '../lib/types';
import type { SubjectInput } from '../lib/validation';

export const ADMIN_PAGE_SIZE = 10;

export interface Paged<T> {
  items: T[];
  total: number;
}

function range(page: number) {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  return [from, from + ADMIN_PAGE_SIZE - 1] as const;
}

export interface AdminStats {
  students: number;
  tutors: number;
  pendingApprovals: number;
  bookings: number;
  pendingBookings: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = requireSupabase();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: c, error } = await q;
    if (error) throw error;
    return c ?? 0;
  };
  const [students, tutors, pendingApprovals, bookings, pendingBookings] = await Promise.all([
    count(db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')),
    count(db.from('tutor_profiles').select('id', { count: 'exact', head: true })),
    count(db.from('tutor_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    count(db.from('bookings').select('id', { count: 'exact', head: true })),
    count(db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
  ]);
  return { students, tutors, pendingApprovals, bookings, pendingBookings };
}

export interface AdminTutorRow extends TutorProfile {
  profile: Pick<Profile, 'email' | 'is_active' | 'full_name'> | null;
}

export async function listTutorsAdmin(opts: { status?: TutorStatus | ''; q?: string; page: number }): Promise<Paged<AdminTutorRow>> {
  let query = requireSupabase()
    .from('tutor_profiles')
    .select('*, profile:profiles(email, is_active, full_name)', { count: 'exact' })
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(...range(opts.page));
  if (opts.status) query = query.eq('status', opts.status);
  const term = sanitizeSearchTerm(opts.q ?? '');
  if (term) query = query.or(`display_name.ilike.%${term}%,headline.ilike.%${term}%,location.ilike.%${term}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as AdminTutorRow[], total: count ?? 0 };
}

export async function setTutorStatus(id: string, status: TutorStatus, note: string) {
  const { data, error } = await requireSupabase()
    .from('tutor_profiles')
    .update({ status, admin_note: note.trim() || null })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Tutor not found or permission denied.');
}

export async function listStudentsAdmin(opts: { q?: string; active?: '' | 'active' | 'inactive'; page: number }): Promise<Paged<Profile>> {
  let query = requireSupabase()
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .range(...range(opts.page));
  if (opts.active) query = query.eq('is_active', opts.active === 'active');
  const term = sanitizeSearchTerm(opts.q ?? '');
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as Profile[], total: count ?? 0 };
}

export async function setUserActive(userId: string, active: boolean) {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update({ is_active: active })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('User not found or permission denied.');
}

export async function createSubject(input: SubjectInput): Promise<Subject> {
  const { data, error } = await requireSupabase()
    .from('subjects')
    .insert({ name: input.name.trim(), slug: input.slug, description: input.description.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data as Subject;
}

export async function updateSubject(id: string, patch: Partial<SubjectInput> & { is_active?: boolean }): Promise<Subject> {
  const body: Record<string, unknown> = { ...patch };
  if (typeof patch.name === 'string') body.name = patch.name.trim();
  if (typeof patch.description === 'string') body.description = patch.description.trim() || null;
  const { data, error } = await requireSupabase().from('subjects').update(body).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Subject not found or permission denied.');
  return data as Subject;
}

export async function listBookingsAdmin(opts: { status?: BookingStatus | ''; q?: string; page: number }): Promise<Paged<Booking>> {
  let query = requireSupabase()
    .from('bookings')
    .select('*, subject:subjects(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(...range(opts.page));
  if (opts.status) query = query.eq('status', opts.status);
  const term = sanitizeSearchTerm(opts.q ?? '');
  if (term) query = query.or(`student_name.ilike.%${term}%,tutor_name.ilike.%${term}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as Booking[], total: count ?? 0 };
}
