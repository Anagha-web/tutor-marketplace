interface DbErrorLike {
  message?: string;
  code?: string;
}

/** Messages raised by our own database triggers are safe and helpful to show as-is. */
const FRIENDLY_DB_MESSAGES = [
  'cannot be in the past',
  'within the next 12 months',
  'does not teach the selected subject',
  'not currently accepting requests',
  'cannot book yourself',
  'before submitting',
  'can only be completed on or after',
  'cannot change from',
  'cannot be changed',
  'cannot deactivate their own account',
  'Only administrators',
];

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = (error ?? {}) as DbErrorLike;
  const message = e.message ?? '';
  if (FRIENDLY_DB_MESSAGES.some((m) => message.includes(m))) return message;
  if (e.code === '23505') return 'That already exists.';
  if (e.code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'You do not have permission to do that.';
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  return fallback;
}

/** Deliberately generic so login responses don't reveal whether an account exists. */
export const GENERIC_LOGIN_ERROR = 'Incorrect email or password, or your email is not yet confirmed.';
export const GENERIC_SIGNUP_ERROR = 'We could not create your account. Please check your details and try again.';

/** Removes characters that have meaning in PostgREST filter strings (used in `.or()`). */
export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()*%\\:"'.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
