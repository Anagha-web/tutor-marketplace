import { toLocalISODate } from './dates';
import type { BookingStatus } from './types';

export type BookingActor = 'student' | 'tutor' | 'admin';

/** Mirrors public.booking_transition_allowed() in the database, which is the real enforcement. */
const TRANSITIONS: Record<BookingActor, Partial<Record<BookingStatus, BookingStatus[]>>> = {
  student: { pending: ['cancelled'] },
  tutor: { pending: ['accepted', 'rejected'], accepted: ['completed', 'cancelled'] },
  admin: { pending: ['accepted', 'rejected', 'cancelled'], accepted: ['completed', 'cancelled'] },
};

export const TERMINAL_STATUSES: BookingStatus[] = ['rejected', 'cancelled', 'completed'];

export function canTransition(actor: BookingActor, from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

/** Status changes the actor may apply to this booking right now. */
export function availableTransitions(
  actor: BookingActor,
  booking: { status: BookingStatus; requested_date: string },
  today: string = toLocalISODate(),
): BookingStatus[] {
  const next = TRANSITIONS[actor][booking.status] ?? [];
  return next.filter((s) => s !== 'completed' || booking.requested_date <= today);
}

export const transitionActionLabel: Record<BookingStatus, string> = {
  accepted: 'Accept',
  rejected: 'Decline',
  cancelled: 'Cancel',
  completed: 'Mark completed',
  pending: 'Reopen',
};
