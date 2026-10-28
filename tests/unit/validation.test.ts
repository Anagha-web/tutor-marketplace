import { describe, expect, it } from 'vitest';
import { readSupabaseConfig } from '../../src/lib/env';
import { friendlyError, sanitizeSearchTerm } from '../../src/lib/errors';
import { safeRedirect } from '../../src/lib/routes';
import {
  slugify,
  validateBooking,
  validateLogin,
  validateRegistration,
  validateSubject,
  validateTutorProfile,
  type TutorProfileInput,
} from '../../src/lib/validation';

const TODAY = '2030-03-15';

describe('validateBooking', () => {
  const valid = { subjectId: 's1', date: '2030-03-20', time: '16:30', message: '' };

  it('accepts a complete future request', () => {
    expect(validateBooking(valid, TODAY)).toEqual({});
    expect(validateBooking({ ...valid, date: TODAY }, TODAY)).toEqual({});
  });

  it('requires subject, date and time', () => {
    const errors = validateBooking({ subjectId: '', date: '', time: '', message: '' }, TODAY);
    expect(Object.keys(errors).sort()).toEqual(['date', 'subjectId', 'time']);
  });

  it('rejects past dates, impossible dates and dates over a year ahead', () => {
    expect(validateBooking({ ...valid, date: '2030-03-14' }, TODAY).date).toMatch(/past/);
    expect(validateBooking({ ...valid, date: '2030-02-30' }, TODAY).date).toMatch(/valid/);
    expect(validateBooking({ ...valid, date: '2031-03-16' }, TODAY).date).toMatch(/12 months/);
  });

  it('rejects malformed times and overlong messages', () => {
    expect(validateBooking({ ...valid, time: '25:00' }, TODAY).time).toBeDefined();
    expect(validateBooking({ ...valid, message: 'x'.repeat(1001) }, TODAY).message).toBeDefined();
  });
});

describe('auth form validation', () => {
  const reg = { fullName: 'Sam Student', email: 'sam@example.com', password: 'secret123', confirmPassword: 'secret123', acceptTerms: true };

  it('accepts a valid registration', () => {
    expect(validateRegistration(reg)).toEqual({});
  });

  it('flags weak passwords, mismatches, bad emails and unaccepted terms', () => {
    expect(validateRegistration({ ...reg, password: 'short1', confirmPassword: 'short1' }).password).toBeDefined();
    expect(validateRegistration({ ...reg, password: 'lettersonly', confirmPassword: 'lettersonly' }).password).toMatch(/number/);
    expect(validateRegistration({ ...reg, confirmPassword: 'nope' }).confirmPassword).toBeDefined();
    expect(validateRegistration({ ...reg, email: 'not-an-email' }).email).toBeDefined();
    expect(validateRegistration({ ...reg, acceptTerms: false }).acceptTerms).toBeDefined();
  });

  it('validates login input', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({});
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
  });
});

describe('validateTutorProfile', () => {
  const base: TutorProfileInput = {
    display_name: 'Tara',
    headline: '',
    bio: '',
    qualifications: '',
    experience_years: '3',
    hourly_rate: '40',
    teaching_mode: 'online',
    location: '',
    avatar_url: '',
  };

  it('accepts a minimal online profile', () => {
    expect(validateTutorProfile(base)).toEqual({});
  });

  it('requires a location for in-person teaching and an https avatar', () => {
    expect(validateTutorProfile({ ...base, teaching_mode: 'in_person' }).location).toBeDefined();
    expect(validateTutorProfile({ ...base, avatar_url: 'http://x.com/a.png' }).avatar_url).toBeDefined();
    expect(validateTutorProfile({ ...base, avatar_url: 'javascript:alert(1)' }).avatar_url).toBeDefined();
  });

  it('bounds experience and rate', () => {
    expect(validateTutorProfile({ ...base, experience_years: '-1' }).experience_years).toBeDefined();
    expect(validateTutorProfile({ ...base, experience_years: '2.5' }).experience_years).toBeDefined();
    expect(validateTutorProfile({ ...base, hourly_rate: '0' }).hourly_rate).toBeDefined();
    expect(validateTutorProfile({ ...base, hourly_rate: '1001' }).hourly_rate).toBeDefined();
    expect(validateTutorProfile({ ...base, hourly_rate: '' }).hourly_rate).toBeUndefined();
  });
});

describe('subjects', () => {
  it('slugifies names', () => {
    expect(slugify('Computer Science')).toBe('computer-science');
    expect(slugify('  Español & Más!! ')).toBe('espanol-mas');
  });

  it('validates subject input', () => {
    expect(validateSubject({ name: 'Latin', slug: 'latin', description: '' })).toEqual({});
    expect(validateSubject({ name: 'L', slug: 'Bad Slug', description: '' })).toHaveProperty('slug');
  });
});

describe('environment configuration', () => {
  it('reports missing variables', () => {
    const r = readSupabaseConfig({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems).toHaveLength(2);
  });

  it('accepts a URL and publishable key', () => {
    const r = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123' });
    expect(r.ok).toBe(true);
  });

  it('refuses secret or service-role keys in the browser', () => {
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    for (const key of ['sb_secret_abc', `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`]) {
      const r = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key });
      expect(r.ok).toBe(false);
    }
  });
});

describe('security helpers', () => {
  it('only allows same-site redirects', () => {
    expect(safeRedirect('/dashboard')).toBe('/dashboard');
    expect(safeRedirect('//evil.example')).toBeNull();
    expect(safeRedirect('/\\evil.example')).toBeNull();
    expect(safeRedirect('https://evil.example')).toBeNull();
    expect(safeRedirect(null)).toBeNull();
  });

  it('strips PostgREST filter syntax from admin search terms', () => {
    expect(sanitizeSearchTerm('a,b),role.eq.admin')).toBe('a b role eq admin');
    expect(sanitizeSearchTerm('%_*')).toBe('_');
  });

  it('maps database errors to safe messages', () => {
    expect(friendlyError({ message: 'new row violates row-level security policy' })).toMatch(/permission/);
    expect(friendlyError({ message: 'Requested date cannot be in the past' })).toBe('Requested date cannot be in the past');
    expect(friendlyError({ message: 'relation "secret_table" does not exist' })).toBe('Something went wrong. Please try again.');
  });
});
