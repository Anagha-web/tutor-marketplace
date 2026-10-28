import { Lock, ShieldAlert, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import type { UserRole } from '../lib/types';
import { ButtonLink } from './ui/Button';
import { EmptyState, LoadingState } from './ui/Feedback';
import { dashboardPath } from '../lib/routes';

function Centered({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-16">{children}</div>;
}

export function ConfigRequired() {
  return (
    <Centered>
      <EmptyState icon={<Lock className="size-6" />} title="Accounts are not available yet">
        This site has not been connected to its database. Set <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then reload. You can still browse sample tutors.
      </EmptyState>
    </Centered>
  );
}

/**
 * UX guard for authenticated areas. It improves navigation but is NOT the security boundary:
 * every query behind these routes is authorised by Supabase RLS policies.
 */
export function ProtectedRoute({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { configured, loading, session, profile, profileError } = useAuth();
  const location = useLocation();

  if (!configured) return <ConfigRequired />;
  if (loading) return <LoadingState label="Checking your account" />;
  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (!profile || profileError) {
    return (
      <Centered>
        <EmptyState icon={<ShieldAlert className="size-6" />} title="We couldn't load your account">
          Please refresh the page or sign in again.
        </EmptyState>
      </Centered>
    );
  }
  if (!profile.is_active) {
    return (
      <Centered>
        <EmptyState icon={<UserX className="size-6" />} title="Your account is deactivated" action={<ButtonLink to="/contact">Contact support</ButtonLink>}>
          An administrator has deactivated this account. Contact us if you think this is a mistake.
        </EmptyState>
      </Centered>
    );
  }
  if (roles && !roles.includes(profile.role)) {
    return (
      <Centered>
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title="You don't have access to this page"
          action={<ButtonLink to={dashboardPath(profile.role)}>Go to my dashboard</ButtonLink>}
        >
          This area is for {roles.join(' or ')} accounts.
        </EmptyState>
      </Centered>
    );
  }
  return <>{children}</>;
}

/** /dashboard sends tutors and admins to their own panels. */
export function DashboardRedirect({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role === 'tutor') return <Navigate to="/tutor" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
