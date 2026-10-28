import { CalendarX } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookingList } from '../../components/BookingList';
import { PageHeader } from '../../components/layout/DashboardLayout';
import { BookingStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { bookingStatusLabel, formatDate, formatDateTime, formatTime } from '../../lib/format';
import type { Booking, BookingStatus } from '../../lib/types';
import { ADMIN_PAGE_SIZE, listBookingsAdmin } from '../../services/admin';
import { AdminToolbar, Table } from './AdminTable';

const STATUSES: BookingStatus[] = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];

export default function AdminBookingsPage() {
  useDocumentTitle('Manage bookings');
  const [params, setParams] = useSearchParams();
  const status = (STATUSES.includes(params.get('status') as BookingStatus) ? params.get('status') : '') as BookingStatus | '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const list = useAsync(() => listBookingsAdmin({ status, q, page }), [status, q, page]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.data?.items.find((b) => b.id === selectedId) ?? null;

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

  const onUpdated = (b: Booking) => list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === b.id ? b : x)) });

  return (
    <>
      <PageHeader title="Bookings" description="Oversee all booking requests across the marketplace." />
      <AdminToolbar query={q} onQuery={onQuery} placeholder="Search by student or tutor name">
        <SelectField label="Status" wrapperClassName="sm:w-44 [&>label]:sr-only" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel[s]}
            </option>
          ))}
        </SelectField>
      </AdminToolbar>

      {list.loading && !list.data ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data?.items.length ? (
        <EmptyState icon={<CalendarX className="size-6" />} title="No bookings found">
          {status || q ? 'Try a different search or filter.' : 'Booking requests will appear here.'}
        </EmptyState>
      ) : (
        <>
          <Table head={['Student', 'Tutor', 'Subject', 'Requested for', 'Status', '']}>
            {list.data.items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{b.student_name || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{b.tutor_name || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{b.subject?.name ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDate(b.requested_date)} · {formatTime(b.requested_time)}
                </td>
                <td className="px-4 py-3">
                  <BookingStatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(b.id)}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={list.data.total} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      <Modal open={!!selected} title="Booking details" onClose={() => setSelectedId(null)} size="lg">
        {selected && (
          <div className="space-y-4">
            <BookingList bookings={[selected]} actor="admin" onUpdated={onUpdated} />
            <dl className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
              <div>
                <dt className="inline">Booking ID: </dt>
                <dd className="inline break-all font-mono">{selected.id}</dd>
              </div>
              <div>
                <dt className="inline">Last updated: </dt>
                <dd className="inline">{formatDateTime(selected.updated_at)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
