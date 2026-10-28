import { CalendarCheck, CalendarClock, GraduationCap, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../../components/layout/DashboardLayout';
import { ErrorState, LoadingState } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getAdminStats } from '../../services/admin';

export default function AdminOverviewPage() {
  useDocumentTitle('Admin overview');
  const stats = useAsync(getAdminStats, []);

  const cards: { label: string; value: number | undefined; icon: LucideIcon; to: string; tone: string }[] = [
    { label: 'Students', value: stats.data?.students, icon: Users, to: '/admin/students', tone: 'bg-sky-100 text-sky-700' },
    { label: 'Tutors', value: stats.data?.tutors, icon: GraduationCap, to: '/admin/tutors', tone: 'bg-brand-100 text-brand-700' },
    { label: 'Pending approvals', value: stats.data?.pendingApprovals, icon: UserCheck, to: '/admin/tutors?status=pending', tone: 'bg-amber-100 text-amber-700' },
    { label: 'Total bookings', value: stats.data?.bookings, icon: CalendarCheck, to: '/admin/bookings', tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Pending bookings', value: stats.data?.pendingBookings, icon: CalendarClock, to: '/admin/bookings?status=pending', tone: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <>
      <PageHeader title="Admin overview" description="Live figures from the marketplace database." />
      {stats.loading ? (
        <LoadingState label="Loading figures" />
      ) : stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ label, value, icon: Icon, to, tone }) => (
            <Link key={label} to={to} className="group">
              <Card className="h-full transition group-hover:border-brand-300 group-hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">{label}</p>
                  <span className={`rounded-lg p-2 ${tone}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{value ?? 0}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
