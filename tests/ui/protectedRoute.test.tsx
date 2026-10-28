import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { makeAuth, renderRoutes, signedIn } from './helpers';

const routes = (roles?: ('student' | 'tutor' | 'admin')[]) => [
  {
    path: '/admin',
    element: (
      <ProtectedRoute roles={roles}>
        <p>Secret admin area</p>
      </ProtectedRoute>
    ),
  },
  { path: '/login', element: <p>Login page</p> },
];

describe('ProtectedRoute', () => {
  it('explains configuration is needed when Supabase is missing', () => {
    renderRoutes(routes(['admin']), '/admin', makeAuth({ configured: false }));
    expect(screen.getByText(/Accounts are not available yet/)).toBeInTheDocument();
    expect(screen.queryByText('Secret admin area')).not.toBeInTheDocument();
  });

  it('shows a loading state while the session is resolved', () => {
    renderRoutes(routes(['admin']), '/admin', makeAuth({ loading: true }));
    expect(screen.getByRole('status')).toHaveTextContent(/Checking your account/);
  });

  it('redirects signed-out users to login with a return path', () => {
    const { router } = renderRoutes(routes(['admin']), '/admin', makeAuth());
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?redirect=%2Fadmin');
  });

  it('blocks users with the wrong role', () => {
    for (const role of ['student', 'tutor'] as const) {
      const { unmount } = renderRoutes(routes(['admin']), '/admin', makeAuth(signedIn(role)));
      expect(screen.getByText(/don't have access/)).toBeInTheDocument();
      expect(screen.queryByText('Secret admin area')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('blocks deactivated accounts even with the right role', () => {
    renderRoutes(routes(['admin']), '/admin', makeAuth(signedIn('admin', { is_active: false })));
    expect(screen.getByText('Your account is deactivated')).toBeInTheDocument();
    expect(screen.queryByText('Secret admin area')).not.toBeInTheDocument();
  });

  it('renders the page for an allowed role', () => {
    renderRoutes(routes(['admin']), '/admin', makeAuth(signedIn('admin')));
    expect(screen.getByText('Secret admin area')).toBeInTheDocument();
  });

  it('allows any signed-in role when no roles are specified', () => {
    renderRoutes(routes(), '/admin', makeAuth(signedIn('student')));
    expect(screen.getByText('Secret admin area')).toBeInTheDocument();
  });
});
