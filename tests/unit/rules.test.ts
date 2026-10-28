import { describe, expect, it } from 'vitest';
import { availableTransitions, canTransition, TERMINAL_STATUSES } from '../../src/lib/bookingRules';
import { adminTutorActions, canTransitionTutor, isPubliclyVisible, missingForSubmission } from '../../src/lib/tutorRules';
import type { BookingStatus } from '../../src/lib/types';

describe('booking status transitions', () => {
  it('lets students only cancel pending requests', () => {
    expect(canTransition('student', 'pending', 'cancelled')).toBe(true);
    expect(canTransition('student', 'pending', 'accepted')).toBe(false);
    expect(canTransition('student', 'accepted', 'cancelled')).toBe(false);
    expect(canTransition('student', 'accepted', 'completed')).toBe(false);
  });

  it('lets tutors accept/decline pending and complete/cancel accepted', () => {
    expect(canTransition('tutor', 'pending', 'accepted')).toBe(true);
    expect(canTransition('tutor', 'pending', 'rejected')).toBe(true);
    expect(canTransition('tutor', 'pending', 'cancelled')).toBe(false);
    expect(canTransition('tutor', 'accepted', 'completed')).toBe(true);
    expect(canTransition('tutor', 'accepted', 'cancelled')).toBe(true);
  });

  it('never allows leaving a terminal status', () => {
    const all: BookingStatus[] = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];
    for (const actor of ['student', 'tutor', 'admin'] as const) {
      for (const from of TERMINAL_STATUSES) {
        for (const to of all) expect(canTransition(actor, from, to)).toBe(false);
      }
    }
  });

  it('hides "completed" until the requested date has arrived', () => {
    const accepted = { status: 'accepted' as const, requested_date: '2030-05-10' };
    expect(availableTransitions('tutor', accepted, '2030-05-09')).toEqual(['cancelled']);
    expect(availableTransitions('tutor', accepted, '2030-05-10')).toEqual(['completed', 'cancelled']);
    expect(availableTransitions('student', accepted, '2030-05-10')).toEqual([]);
  });
});

describe('tutor approval rules', () => {
  it('tutors can only submit drafts or rejected profiles', () => {
    expect(canTransitionTutor('tutor', 'draft', 'pending')).toBe(true);
    expect(canTransitionTutor('tutor', 'rejected', 'pending')).toBe(true);
    expect(canTransitionTutor('tutor', 'pending', 'approved')).toBe(false);
    expect(canTransitionTutor('tutor', 'suspended', 'approved')).toBe(false);
  });

  it('admins approve, request changes, suspend and reactivate', () => {
    expect(adminTutorActions('pending')).toEqual(['approved', 'rejected']);
    expect(adminTutorActions('approved')).toEqual(['suspended']);
    expect(adminTutorActions('suspended')).toEqual(['approved']);
    expect(adminTutorActions('draft')).toEqual([]);
  });

  it('lists what is missing before submission', () => {
    expect(missingForSubmission({ display_name: '', bio: 'short', hourly_rate: null }, 0)).toHaveLength(4);
    expect(missingForSubmission({ display_name: 'A', bio: 'x'.repeat(50), hourly_rate: 20 }, 1)).toEqual([]);
  });

  it('only approved tutors with active accounts are public', () => {
    expect(isPubliclyVisible('approved', true)).toBe(true);
    expect(isPubliclyVisible('approved', false)).toBe(false);
    expect(isPubliclyVisible('pending', true)).toBe(false);
    expect(isPubliclyVisible('suspended', true)).toBe(false);
  });
});
