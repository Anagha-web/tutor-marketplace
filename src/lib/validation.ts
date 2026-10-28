import { addDays, isISODate, toLocalISODate } from './dates';
import type { TeachingMode } from './types';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ---- Booking requests ------------------------------------------------------

export interface BookingInput {
  subjectId: string;
  date: string;
  time: string;
  message: string;
}

export const MAX_BOOKING_MESSAGE = 1000;
export const MAX_BOOKING_DAYS_AHEAD = 365;

export function validateBooking(input: BookingInput, today: string = toLocalISODate()): FieldErrors<BookingInput> {
  const errors: FieldErrors<BookingInput> = {};
  if (!input.subjectId) errors.subjectId = 'Choose a subject.';
  if (!input.date) errors.date = 'Choose a date.';
  else if (!isISODate(input.date)) errors.date = 'Enter a valid date.';
  else if (input.date < today) errors.date = 'The date cannot be in the past.';
  else if (input.date > addDays(today, MAX_BOOKING_DAYS_AHEAD)) errors.date = 'Choose a date within the next 12 months.';
  if (!input.time) errors.time = 'Choose a preferred time.';
  else if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(input.time)) errors.time = 'Enter a valid time.';
  if (input.message.length > MAX_BOOKING_MESSAGE) {
    errors.message = `Keep your message under ${MAX_BOOKING_MESSAGE} characters.`;
  }
  return errors;
}

// ---- Authentication --------------------------------------------------------

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;

export function validateRegistration(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  if (input.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  else if (input.fullName.trim().length > 80) errors.fullName = 'Keep your name under 80 characters.';
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (!/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    errors.password = 'Include at least one letter and one number.';
  }
  if (input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.';
  if (!input.acceptTerms) errors.acceptTerms = 'Please accept the terms to continue.';
  return errors;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}

// ---- Tutor profiles --------------------------------------------------------

export interface TutorProfileInput {
  display_name: string;
  headline: string;
  bio: string;
  qualifications: string;
  experience_years: string;
  hourly_rate: string;
  teaching_mode: TeachingMode;
  location: string;
  avatar_url: string;
}

export function validateTutorProfile(input: TutorProfileInput): FieldErrors<TutorProfileInput> {
  const errors: FieldErrors<TutorProfileInput> = {};
  if (!input.display_name.trim()) errors.display_name = 'Enter the name students will see.';
  else if (input.display_name.length > 80) errors.display_name = 'Keep it under 80 characters.';
  if (input.headline.length > 120) errors.headline = 'Keep it under 120 characters.';
  if (input.bio.length > 3000) errors.bio = 'Keep your bio under 3000 characters.';
  if (input.qualifications.length > 1500) errors.qualifications = 'Keep it under 1500 characters.';

  const years = Number(input.experience_years);
  if (input.experience_years === '' || !Number.isInteger(years) || years < 0 || years > 60) {
    errors.experience_years = 'Enter whole years between 0 and 60.';
  }
  if (input.hourly_rate !== '') {
    const rate = Number(input.hourly_rate);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) errors.hourly_rate = 'Enter a rate between 1 and 1000.';
    else if (Math.round(rate * 100) !== rate * 100) errors.hourly_rate = 'Use at most two decimal places.';
  }
  if (input.teaching_mode !== 'online' && !input.location.trim()) {
    errors.location = 'Add the area where you teach in person.';
  } else if (input.location.length > 120) errors.location = 'Keep it under 120 characters.';
  if (input.avatar_url && !/^https:\/\/\S+$/.test(input.avatar_url)) {
    errors.avatar_url = 'Use an https:// image link.';
  } else if (input.avatar_url.length > 500) errors.avatar_url = 'Link is too long.';
  return errors;
}

// ---- Subjects --------------------------------------------------------------

export interface SubjectInput {
  name: string;
  slug: string;
  description: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function validateSubject(input: SubjectInput): FieldErrors<SubjectInput> {
  const errors: FieldErrors<SubjectInput> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2–60 characters.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens.';
  if (input.description.length > 300) errors.description = 'Keep it under 300 characters.';
  return errors;
}
