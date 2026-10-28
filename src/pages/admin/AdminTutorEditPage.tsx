import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card, PageHeader } from '../../components/layout/DashboardLayout';
import { TutorProfileForm } from '../../components/TutorProfileForm';
import { TutorStatusBadge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { listSubjects } from '../../services/catalog';
import { getTutorProfileById, saveTutorProfile, toProfileInput } from '../../services/tutorAccount';

export default function AdminTutorEditPage() {
  useDocumentTitle('Edit tutor record');
  const { id = '' } = useParams();
  const tutor = useAsync(() => getTutorProfileById(id), [id]);
  const subjects = useAsync(() => listSubjects(true), []);

  if (tutor.loading || subjects.loading) return <LoadingState />;
  if (tutor.error || subjects.error) return <ErrorState error={tutor.error ?? subjects.error} onRetry={() => (tutor.reload(), subjects.reload())} />;
  if (!tutor.data) return <EmptyState title="Tutor not found" action={<Link to="/admin/tutors" className="text-brand-700 underline">Back to tutors</Link>} />;

  const p = tutor.data;
  return (
    <>
      <Link to="/admin/tutors" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Back to tutors
      </Link>
      <PageHeader
        title={`Edit ${p.display_name || 'tutor'}`}
        description={
          <span className="inline-flex items-center gap-2">
            Status: <TutorStatusBadge status={p.status} /> · Change status from the tutor list.
          </span>
        }
      />
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
    </>
  );
}
