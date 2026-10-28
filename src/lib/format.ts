import { site } from '../config/site';
import type { BookingStatus, TeachingMode, TutorStatus } from './types';

const money = new Intl.NumberFormat(site.locale, {
  style: 'currency',
  currency: site.currency,
  maximumFractionDigits: 0,
});

export function formatRate(rate: number | null | undefined): string {
  return rate == null ? 'Rate not set' : `${money.format(Number(rate))}/hr`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(site.locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(site.locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(site.locale, { hour: 'numeric', minute: '2-digit' });
}

export const teachingModeLabel: Record<TeachingMode, string> = {
  online: 'Online',
  in_person: 'In person',
  both: 'Online & in person',
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const tutorStatusLabel: Record<TutorStatus, string> = {
  draft: 'Draft',
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Changes requested',
  suspended: 'Suspended',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
