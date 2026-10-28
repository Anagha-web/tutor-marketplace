import { Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { friendlyError } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import type { Profile } from '../../lib/types';
import { ADMIN_PAGE_SIZE, listStudentsAdmin, setUserActive } from '../../services/admin';
import { AdminToolbar, Table } from './AdminTable';

export default function AdminStudentsPage() {
  useDocumentTitle('Manage students');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const active = (['active', 'inactive'].includes(params.get('active') ?? '') ? params.get('active') : '') as '' | 'active' | 'inactive';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useAsync(() => listStudentsAdmin({ q, active, page }), [q, active, page]);
  const [target, setTarget] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setParam = useCallback(
    (key: string, value: string) =>
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        if (value) p.set(key, value);
        else p.delete(key);
        if (key !== 'page') p.delete('page');
        return p;
      }),
    [setParams],
  );
  const onQuery = useCallback((v: string) => setParam('q', v), [setParam]);

  const toggle = async () => {
    if (!target) return;
    setSaving(true);
    setError('');
    try {
      await setUserActive(target.id, !target.is_active);
      list.setData((d) => d && { ...d, items: d.items.map((s) => (s.id === target.id ? { ...s, is_active: !s.is_active } : s)) });
      setTarget(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Students" description="View student accounts and control access." />
      <AdminToolbar query={q} onQuery={onQuery} placeholder="Search by name or email">
        <SelectField label="Account status" wrapperClassName="sm:w-44 [&>label]:sr-only" value={active} onChange={(e) => setParam('active', e.target.value)}>
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </SelectField>
      </AdminToolbar>

      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data?.items.length ? (
        <EmptyState icon={<Users className="size-6" />} title="No students found">
          {q || active ? 'Try a different search or filter.' : 'Students will appear here after they sign up.'}
        </EmptyState>
      ) : (
        <>
          <Table head={['Student', 'Phone', 'Joined', 'Status', '']}>
            {list.data.items.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{s.full_name || '—'}</p>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{s.phone || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(s.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge color={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Active' : 'Deactivated'}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => (setError(''), setTarget(s))}>
                    {s.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={list.data.total} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.is_active ? 'Deactivate student?' : 'Reactivate student?'}
        message={
          target?.is_active
            ? `${target.full_name || 'This student'} will no longer be able to send booking requests or use their dashboard.`
            : `${target?.full_name || 'This student'} will regain access to their account.`
        }
        confirmLabel={target?.is_active ? 'Deactivate' : 'Reactivate'}
        tone={target?.is_active ? 'danger' : 'primary'}
        loading={saving}
        onConfirm={toggle}
        onCancel={() => setTarget(null)}
      >
        {error && <Alert tone="error">{error}</Alert>}
      </ConfirmDialog>
    </>
  );
}
