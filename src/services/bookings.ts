import { requireSupabase } from '../lib/supabase';
import type { Booking, BookingStatus } from '../lib/types';
import type { BookingInput } from '../lib/validation';

const BOOKING_SELECT = '*, subject:subjects(name)';

/**
 * Creates a booking request. student_id must equal the signed-in user (enforced by RLS);
 * status, names and timestamps are set by the database, not the browser.
 */
export async function createBooking(studentId: string, tutorId: string, input: BookingInput): Promise<Booking> {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .insert({
      student_id: studentId,
      tutor_id: tutorId,
      subject_id: input.subjectId,
      requested_date: input.date,
      requested_time: input.time,
      message: input.message.trim() || null,
    })
    .select(BOOKING_SELECT)
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function listStudentBookings(studentId: string): Promise<Booking[]> {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function listTutorBookings(tutorProfileId: string): Promise<Booking[]> {
  const { data, error } = await requireSupabase()
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('tutor_id', tutorProfileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus, note?: string): Promise<Booking> {
  const patch: Record<string, unknown> = { status };
  if (note !== undefined) patch.status_note = note.trim() || null;
  const { data, error } = await requireSupabase()
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .select(BOOKING_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Booking not found or you do not have permission to update it.');
  return data as Booking;
}

export async function getBookingContacts(id: string): Promise<{ student_email: string | null; tutor_email: string | null } | null> {
  const { data, error } = await requireSupabase().rpc('get_booking_contacts', { p_booking_id: id });
  if (error) throw error;
  return (data as { student_email: string | null; tutor_email: string | null }[] | null)?.[0] ?? null;
}
