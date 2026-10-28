import { CalendarClock, CheckCircle2, ExternalLink, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookingsPanel } from '../../components/BookingsPanel';
import { Card, PageHeader } from '../../components/layout/DashboardLayout';
import { TutorProfileForm } from '../../components/TutorProfileForm';
import { TutorStatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useAuth } from '../../context/auth';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { friendlyError } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { canTransitionTutor, missingForSubmission } from '../../lib/tutorRules';
import type { TutorStatus } from '../../lib/types';
import { listTutorBookings } from '../../services/bookings';
import { listSubjects } from '../../services/catalog';
import { getTutorProfileByUser, saveTutorProfile, submitTutorProfileForReview, toProfileInput } from '../../services/tutorAccount';

const statusHelp: Record<TutorStatus, string> = {
  draft: 'Your profile is a draft. Complete it and submit it for review to appear in search.',
  pending: 'Your profile is waiting for review by our team. You can keep editing while you wait.',
  approved: 'Your profile is live in search and students can send you booking requests.',
  rejected: 'Changes were requested. Update your profile using the note below and resubmit.',
  suspended: 'Your profile is suspended and hidden from search. Contact support for details.',
};

function useMyTutorProfile() {
  const { profile } = useAuth();
  const userId = profile?.id ?? '';
  return useAsync(() => getTutorProfileByUser(userId), [userId]);
}

export function TutorOverviewPage() {
  useDocumentTitle('Tutor dashboard');
  const tutor = useMyTutorProfile();
  const tutorId = tutor.data?.id ?? '';
  const bookings = useAsync(() => (tutorId ? listTutorBookings(tutorId) : Promise.resolve([])), [tutorId]);

  if (tutor.loading) return <LoadingState />;
  if (tutor.error || !tutor.data) return <ErrorState error={tutor.error ?? new Error('missing')} onRetry={tutor.reload} title="Could not load your tutor profile" />;

  const p = tutor.data;
  const pendingCount = bookings.data?.filter((b) => b.status === 'pending').length ?? 0;

  return (
    <>
      <PageHeader title="Tutor dashboard" description="Manage your profile and respond to booking requests." />
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Profile status</h2>
              <TutorStatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{statusHelp[p.status]}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/tutor/profile" variant="outline">
              Edit profile
            </ButtonLink>
            {p.status === 'approved' && (
              <ButtonLink to={`/tutors/${p.id}`} variant="secondary" icon={<ExternalLink className="size-4" aria-hidden />}>
                View public profile
              </ButtonLink>
            )}
          </div>
        </div>
        {p.admin_note && (p.status === 'rejected' || p.status === 'suspended') && (
          <Alert tone="warning" title="Note from the TutorHub team" className="mt-4">
            {p.admin_note}
          </Alert>
        )}
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CalendarClock className="size-6 text-amber-600" aria-hidden />
          <p className="mt-2 text-3xl font-bold text-slate-900">{bookings.loading ? '—' : pendingCount}</p>
          <p className="text-sm text-slate-600">Requests awaiting your response</p>
        </Card>
        <Card>
          <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
          <p className="mt-2 text-3xl font-bold text-slate-900">{bookings.loading ? '—' : (bookings.data?.filter((b) => b.status === 'completed').length ?? 0)}</p>
          <p className="text-sm text-slate-600">Completed lessons</p>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-bold text-slate-900">Booking requests</h2>
      <BookingsPanel
        actor="tutor"
        bookings={bookings.data}
        loading={bookings.loading}
        error={bookings.error}
        reload={bookings.reload}
        onUpdated={(b) => bookings.setData((list) => list?.map((x) => (x.id === b.id ? b : x)))}
        emptyText={p.status === 'approved' ? 'Requests from students will appear here.' : 'Once your profile is approved, students can send you requests.'}
      />
    </>
  );
}

export function TutorProfileEditPage() {
  useDocumentTitle('Edit tutor profile');
  const tutor = useMyTutorProfile();
  const subjects = useAsync(() => listSubjects(true), []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (tutor.loading || subjects.loading) return <LoadingState />;
  if (tutor.error || subjects.error || !tutor.data) {
    return <ErrorState error={tutor.error ?? subjects.error ?? new Error('missing')} onRetry={() => (tutor.reload(), subjects.reload())} />;
  }

  const p = tutor.data;
  const missing = missingForSubmission(p, p.subjectIds.length);
  const canSubmit = canTransitionTutor('tutor', p.status, 'pending');

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitTutorProfileForReview(p.id);
      setConfirmOpen(false);
      tutor.reload();
    } catch (err) {
      setSubmitError(friendlyError(err, 'Could not submit your profile.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Your tutor profile"
        description={
          <>
            This is what students see on your <Link to={`/tutors/${p.id}`} className="text-brand-700 underline">public profile</Link> once approved.
          </>
        }
      />
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <TutorStatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{statusHelp[p.status]}</p>
            {p.submitted_at && <p className="mt-1 text-xs text-slate-500">Last submitted {formatDateTime(p.submitted_at)}</p>}
          </div>
          {canSubmit && (
            <Button onClick={() => setConfirmOpen(true)} disabled={missing.length > 0} icon={<Send className="size-4" aria-hidden />}>
              Submit for review
            </Button>
          )}
        </div>
        {canSubmit && missing.length > 0 && (
          <Alert tone="info" title="Before you can submit" className="mt-4">
            <ul className="list-inside list-disc">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-1">Save your profile after making changes.</p>
          </Alert>
        )}
        {p.admin_note && p.status === 'rejected' && (
          <Alert tone="warning" title="Requested changes" className="mt-4">
            {p.admin_note}
          </Alert>
        )}
      </Card>

      <Card>
        <TutorProfileForm
          key={p.updated_at}
          initial={toProfileInput(p)}
          initialSubjectIds={p.subjectIds}
          subjects={subjects.data ?? []}
          onSave={async (values, subjectIds) => {
            await saveTutorProfile(p.id, values, subjectIds, p.subjectIds);
            tutor.reload();
          }}
        />
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit profile for review?"
        message="Our team will review your profile before it appears in search. Make sure everything is accurate."
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      >
        {submitError && <Alert tone="error">{submitError}</Alert>}
      </ConfirmDialog>
    </>
  );
}
