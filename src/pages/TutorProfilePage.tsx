import { ArrowLeft, Briefcase, GraduationCap, MapPin, Monitor, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookingRequestForm } from '../components/BookingRequestForm';
import { Avatar } from '../components/ui/Avatar';
import { SampleBadge } from '../components/ui/Badge';
import { ButtonLink } from '../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatRate, teachingModeLabel } from '../lib/format';
import { getPublicTutor } from '../services/catalog';

export default function TutorProfilePage() {
  const { id = '' } = useParams();
  const { data: tutor, loading, error, reload } = useAsync(() => getPublicTutor(id), [id]);
  useDocumentTitle(tutor ? `${tutor.display_name} — Tutor` : 'Tutor profile');

  if (loading) return <LoadingState label="Loading tutor" />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }
  if (!tutor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<UserX className="size-6" />} title="Tutor not found" action={<ButtonLink to="/tutors">Browse tutors</ButtonLink>}>
          This profile does not exist or is not currently available.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/tutors" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Back to tutors
      </Link>

      {tutor.isDemo && (
        <Alert tone="warning" title="Sample profile" className="mb-6">
          This is a fictional profile shown for demonstration. The person, qualifications and details are not real.
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={tutor.display_name} src={tutor.avatar_url} size="xl" />
              <div className="min-w-0">
                {tutor.isDemo && <SampleBadge />}
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{tutor.display_name}</h1>
                {tutor.headline && <p className="mt-1 text-lg text-slate-600">{tutor.headline}</p>}
                <p className="mt-3 text-2xl font-bold text-brand-700">{formatRate(tutor.hourly_rate)}</p>
              </div>
            </div>
            <dl className="mt-6 grid gap-3 border-t border-slate-100 pt-6 text-sm sm:grid-cols-3">
              <Fact icon={<Monitor className="size-5" />} label="Teaching mode" value={teachingModeLabel[tutor.teaching_mode]} />
              <Fact icon={<Briefcase className="size-5" />} label="Experience" value={`${tutor.experience_years} ${tutor.experience_years === 1 ? 'year' : 'years'}`} />
              {tutor.teaching_mode !== 'online' && tutor.location && <Fact icon={<MapPin className="size-5" />} label="Location" value={tutor.location} />}
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">About</h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-slate-700">{tutor.bio || 'This tutor has not added a biography yet.'}</p>

            <h2 className="mt-8 text-lg font-bold text-slate-900">Subjects</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tutor.subjects.map((s) => (
                <li key={s.id}>
                  <Link to={`/tutors?subject=${s.slug}`} className="inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800 hover:bg-brand-100">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>

            {tutor.qualifications && (
              <>
                <h2 className="mt-8 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <GraduationCap className="size-5 text-brand-700" aria-hidden /> Qualifications
                </h2>
                <p className="mt-3 whitespace-pre-line break-words text-slate-700">{tutor.qualifications}</p>
                <p className="mt-2 text-xs text-slate-500">Provided by the tutor. Not independently verified by TutorHub.</p>
              </>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="book-heading">
            <h2 id="book-heading" className="text-lg font-bold text-slate-900">
              Request a lesson
            </h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">Choose a subject and your preferred date and time.</p>
            <BookingRequestForm tutor={tutor} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-lg bg-slate-100 p-2 text-slate-500" aria-hidden>
        {icon}
      </span>
      <div>
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="font-semibold text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
