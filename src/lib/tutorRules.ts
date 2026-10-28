import type { TutorProfile, TutorStatus } from './types';

export type TutorActor = 'tutor' | 'admin';

/** Mirrors public.tutor_status_transition_allowed() in the database. */
const TRANSITIONS: Record<TutorActor, Partial<Record<TutorStatus, TutorStatus[]>>> = {
  tutor: { draft: ['pending'], rejected: ['pending'] },
  admin: { pending: ['approved', 'rejected'], approved: ['suspended'], suspended: ['approved'] },
};

export function canTransitionTutor(actor: TutorActor, from: TutorStatus, to: TutorStatus): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

export function adminTutorActions(status: TutorStatus): TutorStatus[] {
  return TRANSITIONS.admin[status] ?? [];
}

export const MIN_BIO_LENGTH = 50;

/** What still needs filling in before a tutor may submit for review (same rules as the DB). */
export function missingForSubmission(
  p: Pick<TutorProfile, 'display_name' | 'bio' | 'hourly_rate'>,
  subjectCount: number,
): string[] {
  const missing: string[] = [];
  if (!p.display_name.trim()) missing.push('Display name');
  if (p.bio.trim().length < MIN_BIO_LENGTH) missing.push(`Bio of at least ${MIN_BIO_LENGTH} characters`);
  if (p.hourly_rate == null) missing.push('Hourly rate');
  if (subjectCount < 1) missing.push('At least one subject');
  return missing;
}

/** Only approved tutors whose account is active are public. */
export function isPubliclyVisible(status: TutorStatus, accountActive: boolean): boolean {
  return status === 'approved' && accountActive;
}
