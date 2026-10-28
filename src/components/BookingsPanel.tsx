import { CalendarX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { BookingActor } from '../lib/bookingRules';
import { bookingStatusLabel } from '../lib/format';
import type { Booking, BookingStatus } from '../lib/types';
import { BookingList } from './BookingList';
import { EmptyState, ErrorState, LoadingState } from './ui/Feedback';

const FILTERS: ('all' | BookingStatus)[] = ['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'];

interface BookingsPanelProps {
  actor: BookingActor;
  bookings: Booking[] | undefined;
  loading: boolean;
  error: unknown;
  reload: () => void;
  onUpdated: (b: Booking) => void;
  emptyAction?: ReactNode;
  emptyText: string;
}

/** Status-filterable booking list with loading, error and empty states. */
export function BookingsPanel({ actor, bookings, loading, error, reload, onUpdated, emptyAction, emptyText }: BookingsPanelProps) {
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  if (loading && !bookings) return <LoadingState label="Loading bookings" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!bookings?.length) {
    return (
      <EmptyState icon={<CalendarX className="size-6" />} title="No booking requests yet" action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  const counts = bookings.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }), {});
  const visible = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div>
      <div role="tablist" aria-label="Filter by status" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const n = f === 'all' ? bookings.length : (counts[f] ?? 0);
          return (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'All' : bookingStatusLabel[f]} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>
      {visible.length ? (
        <BookingList bookings={visible} actor={actor} onUpdated={onUpdated} />
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No bookings with this status.</p>
      )}
    </div>
  );
}
