import type { UserRole } from './types';

export function dashboardPath(role: UserRole | undefined): string {
  return role === 'admin' ? '/admin' : role === 'tutor' ? '/tutor' : '/dashboard';
}

/** Only allow same-site relative redirects to avoid open-redirects via ?redirect=. */
export function safeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
