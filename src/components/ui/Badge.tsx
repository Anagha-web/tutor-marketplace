import type { ReactNode } from 'react';
import { bookingStatusLabel, tutorStatusLabel } from '../../lib/format';
import type { BookingStatus, TutorStatus } from '../../lib/types';

type Color = 'gray' | 'brand' | 'green' | 'amber' | 'red' | 'blue';

const colors: Record<Color, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
};

export function Badge({ color = 'gray', children, className = '' }: { color?: Color; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

const bookingColors: Record<BookingStatus, Color> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  cancelled: 'gray',
  completed: 'blue',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge color={bookingColors[status]}>{bookingStatusLabel[status]}</Badge>;
}

const tutorColors: Record<TutorStatus, Color> = {
  draft: 'gray',
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  suspended: 'red',
};

export function TutorStatusBadge({ status }: { status: TutorStatus }) {
  return <Badge color={tutorColors[status]}>{tutorStatusLabel[status]}</Badge>;
}

export function SampleBadge() {
  return (
    <Badge color="amber" className="uppercase tracking-wide">
      Sample profile
    </Badge>
  );
}
