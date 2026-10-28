import { BookOpen, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { friendlyError } from '../../lib/errors';
import type { Subject } from '../../lib/types';
import { hasErrors, slugify, validateSubject, type FieldErrors, type SubjectInput } from '../../lib/validation';
import { createSubject, updateSubject } from '../../services/admin';
import { listSubjects } from '../../services/catalog';
import { Table } from './AdminTable';

export default function AdminSubjectsPage() {
  useDocumentTitle('Manage subjects');
  const subjects = useAsync(() => listSubjects(true), []);
  const [editing, setEditing] = useState<Subject | 'new' | null>(null);
  const [toggleError, setToggleError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const upsertLocal = (s: Subject) =>
    subjects.setData((list) => {
      const rest = (list ?? []).filter((x) => x.id !== s.id);
      return [...rest, s].sort((a, b) => a.name.localeCompare(b.name));
    });

  const toggle = async (s: Subject) => {
    setBusyId(s.id);
    setToggleError('');
    try {
      upsertLocal(await updateSubject(s.id, { is_active: !s.is_active }));
    } catch (err) {
      setToggleError(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Subjects"
        description="Subjects tutors can teach. Deactivated subjects are hidden from search and new profiles."
        actions={
          <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" aria-hidden />}>
            Add subject
          </Button>
        }
      />
      {toggleError && <Alert tone="error" className="mb-4">{toggleError}</Alert>}
      {subjects.loading ? (
        <LoadingState />
      ) : subjects.error ? (
        <ErrorState error={subjects.error} onRetry={subjects.reload} />
      ) : !subjects.data?.length ? (
        <EmptyState icon={<BookOpen className="size-6" />} title="No subjects yet" action={<Button onClick={() => setEditing('new')}>Add the first subject</Button>}>
          Add subjects so tutors can list what they teach. You can also run <code>supabase/seed.sql</code>.
        </EmptyState>
      ) : (
        <Table head={['Subject', 'Slug', 'Status', '']}>
          {subjects.data.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{s.name}</p>
                {s.description && <p className="max-w-md truncate text-xs text-slate-500">{s.description}</p>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.slug}</td>
              <td className="px-4 py-3">
                <Badge color={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="inline-flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" loading={busyId === s.id} onClick={() => toggle(s)}>
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <SubjectModal
          subject={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            upsertLocal(s);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function SubjectModal({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: (s: Subject) => void }) {
  const [values, setValues] = useState<SubjectInput>({ name: subject?.name ?? '', slug: subject?.slug ?? '', description: subject?.description ?? '' });
  const [slugTouched, setSlugTouched] = useState(!!subject);
  const [errors, setErrors] = useState<FieldErrors<SubjectInput>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateSubject(values);
    setErrors(next);
    if (hasErrors(next)) return;
    setSaving(true);
    setError('');
    try {
      onSaved(subject ? await updateSubject(subject.id, values) : await createSubject(values));
    } catch (err) {
      setError(friendlyError(err, 'Could not save the subject.'));
      setSaving(false);
    }
  };

  return (
    <Modal open title={subject ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label="Name"
          required
          maxLength={60}
          value={values.name}
          onChange={(e) => {
            const name = e.target.value;
            setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
          }}
          error={errors.name}
        />
        <TextField
          label="URL slug"
          required
          maxLength={60}
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setValues((v) => ({ ...v, slug: e.target.value }));
          }}
          error={errors.slug}
          hint="Used in search links, e.g. /tutors?subject=mathematics"
        />
        <TextAreaField label="Description" rows={3} maxLength={300} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} error={errors.description} />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save subject
          </Button>
        </div>
      </form>
    </Modal>
  );
}
