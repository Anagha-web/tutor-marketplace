import { ExternalLink, Pencil, UserSearch } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/DashboardLayout';
import { Badge, TutorStatusBadge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { SelectField, TextAreaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { friendlyError } from '../../lib/errors';
import { formatDateTime, formatRate, teachingModeLabel, tutorStatusLabel } from '../../lib/format';
import { adminTutorActions } from '../../lib/tutorRules';
import type { TutorStatus } from '../../lib/types';
import { ADMIN_PAGE_SIZE, listTutorsAdmin, setTutorStatus, setUserActive, type AdminTutorRow } from '../../services/admin';
import { AdminToolbar, Table } from './AdminTable';

const STATUSES: TutorStatus[] = ['pending', 'approved', 'rejected', 'suspended', 'draft'];
const actionLabel: Partial<Record<TutorStatus, string>> = { approved: 'Approve', rejected: 'Request changes', suspended: 'Suspend' };

export default function AdminTutorsPage() {
  useDocumentTitle('Manage tutors');
  const [params, setParams] = useSearchParams();
  const status = (STATUSES.includes(params.get('status') as TutorStatus) ? params.get('status') : '') as TutorStatus | '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useAsync(() => listTutorsAdmin({ status, q, page }), [status, q, page]);
  const [selected, setSelected] = useState<AdminTutorRow | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (value) p.set(key, value);
        else p.delete(key);
        if (key !== 'page') p.delete('page');
        return p;
      });
    },
    [setParams],
  );
  const onQuery = useCallback((v: string) => setParam('q', v), [setParam]);

  return (
    <>
      <PageHeader title="Tutors" description="Review applications and manage tutor accounts." />
      <AdminToolbar query={q} onQuery={onQuery} placeholder="Search by name, headline or location">
        <SelectField label="Status" wrapperClassName="sm:w-52 [&>label]:sr-only" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tutorStatusLabel[s]}
            </option>
          ))}
        </SelectField>
      </AdminToolbar>

      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data?.items.length ? (
        <EmptyState icon={<UserSearch className="size-6" />} title="No tutors found">
          {status || q ? 'Try changing the search or status filter.' : 'Tutor accounts will appear here after they sign up.'}
        </EmptyState>
      ) : (
        <>
          <Table head={['Tutor', 'Status', 'Rate', 'Submitted', '']}>
            {list.data.items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{t.display_name || t.profile?.full_name || 'Unnamed tutor'}</p>
                  <p className="text-xs text-slate-500">{t.profile?.email}</p>
                  {t.profile && !t.profile.is_active && <Badge color="red" className="mt-1">Account deactivated</Badge>}
                </td>
                <td className="px-4 py-3">
                  <TutorStatusBadge status={t.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatRate(t.hourly_rate)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(t.submitted_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(t)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={list.data.total} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      {selected && (
        <TutorReviewModal
          tutor={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function TutorReviewModal({ tutor, onClose, onChanged }: { tutor: AdminTutorRow; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState(tutor.admin_note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const actions = adminTutorActions(tutor.status);
  const needsNote = (s: TutorStatus) => s === 'rejected' || s === 'suspended';

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(friendlyError(err, 'Could not update this tutor.'));
      setBusy(null);
    }
  };

  const changeStatus = (s: TutorStatus) => {
    if (needsNote(s) && !note.trim()) {
      setError('Add a note explaining the reason. The tutor will see it.');
      return;
    }
    void run(s, () => setTutorStatus(tutor.id, s, note));
  };

  return (
    <Modal open title={tutor.display_name || 'Tutor application'} onClose={onClose} size="lg">
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <TutorStatusBadge status={tutor.status} />
          <span className="text-slate-500">{tutor.profile?.email}</span>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Rate</dt>
            <dd className="font-medium">{formatRate(tutor.hourly_rate)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mode</dt>
            <dd className="font-medium">
              {teachingModeLabel[tutor.teaching_mode]}
              {tutor.location && ` · ${tutor.location}`}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Experience</dt>
            <dd className="font-medium">{tutor.experience_years} years</dd>
          </div>
        </dl>
        <div>
          <h3 className="font-semibold text-slate-900">Headline</h3>
          <p className="mt-1 text-slate-700">{tutor.headline || '—'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Biography</h3>
          <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line break-words text-slate-700">{tutor.bio || '—'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Qualifications (self-reported)</h3>
          <p className="mt-1 whitespace-pre-line break-words text-slate-700">{tutor.qualifications || '—'}</p>
        </div>

        <TextAreaField label="Note to tutor" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} hint="Required when requesting changes or suspending. Visible to the tutor." />
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {actions.map((s) => (
            <Button key={s} variant={s === 'approved' ? 'primary' : 'danger'} loading={busy === s} disabled={!!busy} onClick={() => changeStatus(s)}>
              {tutor.status === 'suspended' && s === 'approved' ? 'Reactivate' : actionLabel[s]}
            </Button>
          ))}
          {actions.length === 0 && <p className="text-slate-500">No status changes available while the profile is {tutorStatusLabel[tutor.status].toLowerCase()}.</p>}
          <ButtonLink to={`/admin/tutors/${tutor.id}`} variant="outline" icon={<Pencil className="size-4" aria-hidden />}>
            Edit record
          </ButtonLink>
          {tutor.status === 'approved' && (
            <Link to={`/tutors/${tutor.id}`} target="_blank" className="inline-flex items-center gap-1 self-center text-sm font-medium text-brand-700 hover:underline">
              Public profile <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
        {tutor.profile && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <span className="text-slate-600">Login account is {tutor.profile.is_active ? 'active' : 'deactivated'}.</span>
            <Button
              size="sm"
              variant="outline"
              loading={busy === 'active'}
              disabled={!!busy}
              onClick={() => run('active', () => setUserActive(tutor.user_id, !tutor.profile!.is_active))}
            >
              {tutor.profile.is_active ? 'Deactivate account' : 'Reactivate account'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
