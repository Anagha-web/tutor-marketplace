import { Search } from 'lucide-react';
import { BookingsPanel } from '../../components/BookingsPanel';
import { PageHeader } from '../../components/layout/DashboardLayout';
import { ButtonLink } from '../../components/ui/Button';
import { useAuth } from '../../context/auth';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { listStudentBookings } from '../../services/bookings';

export default function StudentBookingsPage() {
  useDocumentTitle('My bookings');
  const { profile } = useAuth();
  const userId = profile?.id ?? '';
  const bookings = useAsync(() => listStudentBookings(userId), [userId]);

  return (
    <>
      <PageHeader
        title={`Hi ${profile?.full_name.split(' ')[0] || 'there'}`}
        description="Track your booking requests. Pending requests can be cancelled at any time before the tutor responds."
        actions={
          <ButtonLink to="/tutors" icon={<Search className="size-4" aria-hidden />}>
            Find a tutor
          </ButtonLink>
        }
      />
      <BookingsPanel
        actor="student"
        bookings={bookings.data}
        loading={bookings.loading}
        error={bookings.error}
        reload={bookings.reload}
        onUpdated={(b) => bookings.setData((list) => list?.map((x) => (x.id === b.id ? b : x)))}
        emptyText="When you send a booking request to a tutor, it will appear here with its status."
        emptyAction={<ButtonLink to="/tutors">Browse tutors</ButtonLink>}
      />
    </>
  );
}
