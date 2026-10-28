import { CalendarCheck, Info } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { site } from '../config/site';
import { useAuth } from '../context/auth';
import { addDays, toLocalISODate } from '../lib/dates';
import { friendlyError } from '../lib/errors';
import type { PublicTutor } from '../lib/types';
import { hasErrors, MAX_BOOKING_DAYS_AHEAD, MAX_BOOKING_MESSAGE, validateBooking, type BookingInput, type FieldErrors } from '../lib/validation';
import { createBooking } from '../services/bookings';
import { Button, ButtonLink } from './ui/Button';
import { Alert } from './ui/Feedback';
import { SelectField, TextAreaField, TextField } from './ui/Field';

const empty: BookingInput = { subjectId: '', date: '', time: '', message: '' };

export function BookingRequestForm({ tutor }: { tutor: PublicTutor }) {
  const { configured, session, profile } = useAuth();
  const location = useLocation();
  const [values, setValues] = useState<BookingInput>(() => ({
    ...empty,
    subjectId: tutor.subjects.length === 1 ? tutor.subjects[0].id : '',
  }));
  const [errors, setErrors] = useState<FieldErrors<BookingInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const today = toLocalISODate();

  if (tutor.isDemo || !configured) {
    return (
      <Alert tone="warning" title="Booking disabled for sample profiles">
        This is fictional sample content. Booking requests are available for real, approved tutors once the site is connected to its database.
      </Alert>
    );
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname);
    return (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Log in with a student account to send {tutor.display_name} a booking request.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <ButtonLink to={`/login?redirect=${redirect}`}>Log in to book</ButtonLink>
          <ButtonLink to={`/register?redirect=${redirect}`} variant="outline">
            Create account
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (profile && profile.role !== 'student') {
    return <Alert tone="info">Booking requests can only be sent from student accounts.</Alert>;
  }

  if (success) {
    return (
      <Alert tone="success" title="Request sent">
        <p>
          {tutor.display_name} will review your request. You can follow its status in your{' '}
          <Link to="/dashboard" className="font-semibold underline">
            dashboard
          </Link>
          .
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setValues(empty);
            setSuccess(false);
          }}
        >
          Send another request
        </Button>
      </Alert>
    );
  }

  const set = <K extends keyof BookingInput>(key: K, value: BookingInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    const nextErrors = validateBooking(values, today);
    setErrors(nextErrors);
    if (hasErrors(nextErrors) || !session) return;
    setSubmitting(true);
    try {
      await createBooking(session.user.id, tutor.id, values);
      setSuccess(true);
    } catch (err) {
      setServerError(friendlyError(err, 'We could not send your request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <SelectField label="Subject" required value={values.subjectId} onChange={(e) => set('subjectId', e.target.value)} error={errors.subjectId}>
        <option value="">Select a subject</option>
        {tutor.subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Preferred date"
          type="date"
          required
          min={today}
          max={addDays(today, MAX_BOOKING_DAYS_AHEAD)}
          value={values.date}
          onChange={(e) => set('date', e.target.value)}
          error={errors.date}
        />
        <TextField label="Preferred time" type="time" required value={values.time} onChange={(e) => set('time', e.target.value)} error={errors.time} />
      </div>
      <TextAreaField
        label="Message (optional)"
        rows={4}
        maxLength={MAX_BOOKING_MESSAGE}
        placeholder="Share your goals, level and anything the tutor should know."
        value={values.message}
        onChange={(e) => set('message', e.target.value)}
        error={errors.message}
        hint={`${values.message.length}/${MAX_BOOKING_MESSAGE} characters`}
      />
      <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="size-4 shrink-0 text-slate-400" aria-hidden />
        This is a request, not a confirmed booking. The time is not guaranteed until the tutor accepts. No payment is taken through {site.name}.
      </p>
      <Button type="submit" className="w-full" size="lg" loading={submitting} icon={<CalendarCheck className="size-5" aria-hidden />}>
        Send booking request
      </Button>
    </form>
  );
}
