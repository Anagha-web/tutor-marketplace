import type { Session } from '@supabase/supabase-js';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../src/context/auth';
import type { Profile, UserRole } from '../../src/lib/types';

export function makeProfile(role: UserRole, patch: Partial<Profile> = {}): Profile {
  return {
    id: `${role}-id`,
    role,
    full_name: `Test ${role}`,
    email: `${role}@example.com`,
    phone: null,
    is_active: true,
    created_at: '2030-01-01T00:00:00Z',
    updated_at: '2030-01-01T00:00:00Z',
    ...patch,
  };
}

export function makeAuth(patch: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    configured: true,
    loading: false,
    session: null,
    profile: null,
    profileError: false,
    signIn: vi.fn(async () => ({ ok: true })),
    signUp: vi.fn(async () => ({ ok: true, needsConfirmation: true })),
    signOut: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => {}),
    ...patch,
  };
}

export function signedIn(role: UserRole, profilePatch: Partial<Profile> = {}): Partial<AuthContextValue> {
  const profile = makeProfile(role, profilePatch);
  return { session: { user: { id: profile.id } } as Session, profile };
}

/** Renders routes inside a memory router with a fake auth context. */
export function renderRoutes(routes: RouteObject[], url: string, auth: AuthContextValue = makeAuth()) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const utils = render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return { ...utils, router };
}

export function renderAt(element: ReactElement, url = '/', auth?: AuthContextValue, path = '*') {
  return renderRoutes([{ path, element }, { path: '/login', element: <p>Login page</p> }], url, auth);
}
