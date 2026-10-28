import { CalendarDays, Clock, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { availableTransitions, transitionActionLabel, type BookingActor } from '../lib/bookingRules';
import { friendlyError } from '../lib/errors';
import { bookingStatusLabel, formatDate, formatDateTime, formatTime } from '../lib/format';
import type { Booking, BookingStatus } from '../lib/types';
import { getBookingContacts, updateBookingStatus } from '../services/bookings';
import { BookingStatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { Alert } from './ui/Feedback';
import { TextAreaField } from './ui/Field';
import { ConfirmDialog } from './ui/Modal';

interface BookingListProps {
  bookings: Booking[];
  actor: BookingActor;
  onUpdated: (booking: Booking) => void;
}

interface PendingAction {
  booking: Booking;
  status: BookingStatus;
}

const confirmCopy: Partial<Record<BookingStatus, string>> = {
  accepted: 'The student will see this request as accepted and both of you will be able to see each other’s contact email.',
  rejected: 'The student will see that this request was declined. This cannot be undone.',
  cancelled: 'This booking will be cancelled. This cannot be undone.',
  completed: 'Mark this lesson as completed. This cannot be undone.',
};

export function BookingList({ bookings, actor, onUpdated }: BookingListProps) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateBookingStatus(pending.booking.id, pending.status, actor === 'student' ? undefined : note);
      onUpdated(updated);
      setPending(null);
    } catch (err) {
      setError(friendlyError(err, 'Could not update this booking.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ul className="space-y-3">
        {bookings.map((b) => (
          <BookingItem
            key={b.id}
            booking={b}
            actor={actor}
            onAction={(status) => {
              setError('');
              setNote(b.status_note ?? '');
              setPending({ booking: b, status });
            }}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={!!pending}
        title={pending ? `${transitionActionLabel[pending.status]} booking?` : ''}
        message={pending ? confirmCopy[pending.status] : ''}
        confirmLabel={pending ? transitionActionLabel[pending.status] : ''}
        tone={pending && ['rejected', 'cancelled'].includes(pending.status) ? 'danger' : 'primary'}
        loading={saving}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {error && <Alert tone="error">{error}</Alert>}
        {actor !== 'student' && (
          <TextAreaField
            label="Note to the student (optional)"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Visible to the student on this booking."
          />
        )}
      </ConfirmDialog>
    </>
  );
}

function BookingItem({ booking: b, actor, onAction }: { booking: Booking; actor: BookingActor; onAction: (s: BookingStatus) => void }) {
  const actions = availableTransitions(actor, b);
  const counterpart = actor === 'student' ? b.tutor_name : actor === 'tutor' ? b.student_name : `${b.student_name} → ${b.tutor_name}`;
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{b.subject?.name ?? 'Lesson'}</h3>
            <BookingStatusBadge status={b.status} />
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {actor === 'student' ? 'with ' : actor === 'tutor' ? 'from ' : ''}
            <span className="font-medium text-slate-800">{counterpart || 'Unknown'}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-slate-400" aria-hidden />
              {formatDate(b.requested_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-slate-400" aria-hidden />
              {formatTime(b.requested_time)} (requested)
            </span>
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {actions.map((s) => (
              <Button key={s} size="sm" variant={s === 'accepted' || s === 'completed' ? 'primary' : 'outline'} onClick={() => onAction(s)}>
                {transitionActionLabel[s]}
              </Button>
            ))}
          </div>
        )}
      </div>
      {b.message && (
        <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          <span className="whitespace-pre-line break-words">{b.message}</span>
        </p>
      )}
      {b.status_note && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium">Tutor note:</span> {b.status_note}
        </p>
      )}
      {(b.status === 'accepted' || b.status === 'completed') && <ContactReveal bookingId={b.id} actor={actor} />}
      <p className="mt-3 text-xs text-slate-400">
        Requested {formatDateTime(b.created_at)} · Status: {bookingStatusLabel[b.status]}
      </p>
    </li>
  );
}

function ContactReveal({ bookingId, actor }: { bookingId: string; actor: BookingActor }) {
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const load = async () => {
    setState('loading');
    try {
      const c = await getBookingContacts(bookingId);
      const value = actor === 'student' ? c?.tutor_email : actor === 'tutor' ? c?.student_email : `${c?.student_email} / ${c?.tutor_email}`;
      setEmail(value ?? 'Not available');
      setState('idle');
    } catch {
      setState('error');
    }
  };
  if (email) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700">
        <Mail className="size-4 text-slate-400" aria-hidden />
        {email}
      </p>
    );
  }
  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" onClick={load} loading={state === 'loading'} icon={<Mail className="size-4" aria-hidden />}>
        Show contact email
      </Button>
      {state === 'error' && <span className="text-xs text-red-600">Could not load contact details.</span>}
    </div>
  );
}
