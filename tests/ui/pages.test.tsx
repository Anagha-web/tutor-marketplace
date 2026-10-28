import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingRequestForm } from '../../src/components/BookingRequestForm';
import { SiteLayout } from '../../src/components/layout/SiteLayout';
import { demoTutors } from '../../src/data/demo';
import type { PublicTutor } from '../../src/lib/types';
import TutorsPage from '../../src/pages/TutorsPage';
import { makeAuth, renderAt, renderRoutes, signedIn } from './helpers';

vi.mock('../../src/services/bookings', () => ({ createBooking: vi.fn(async () => ({})) }));
const { createBooking } = await import('../../src/services/bookings');

const realTutor: PublicTutor = {
  ...demoTutors[0],
  id: '11111111-1111-4111-8111-111111111111',
  isDemo: false,
  subjects: [
    { id: 'sub-1', name: 'Mathematics', slug: 'mathematics' },
    { id: 'sub-2', name: 'Test Prep', slug: 'test-prep' },
  ],
};

describe('site layout', () => {
  const layoutRoutes = [{ path: '/', element: <SiteLayout />, children: [{ index: true, element: <p>Home</p> }] }];

  it('shows the demo-mode banner when Supabase is not configured (tests force demo mode)', () => {
    renderRoutes(layoutRoutes, '/');
    expect(screen.getByText(/Demo mode:/)).toBeInTheDocument();
  });

  it('has a working, accessible mobile menu and responsive navigation classes', async () => {
    const user = userEvent.setup();
    renderRoutes(layoutRoutes, '/');
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('md:hidden');
    expect(screen.getByRole('navigation', { name: 'Main' }).className).toMatch(/hidden.*md:flex/);
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('navigation', { name: 'Mobile' })).getByText('Find tutors')).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Mobile' })).getByText('About'));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });

  it('shows login links when signed out and a dashboard link when signed in', () => {
    const { unmount } = renderRoutes(layoutRoutes, '/');
    expect(screen.getAllByRole('link', { name: 'Log in' }).length).toBeGreaterThan(0);
    unmount();
    renderRoutes(layoutRoutes, '/', makeAuth(signedIn('admin')));
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/admin');
  });
});

describe('tutor search page (demo data)', () => {
  it('lists sample tutors with clear labels', async () => {
    renderAt(<TutorsPage />, '/tutors');
    expect(await screen.findByText(`${demoTutors.length} tutors found`)).toBeInTheDocument();
    expect(screen.getByText(/fictional sample tutors/)).toBeInTheDocument();
    expect(screen.getAllByText('Sample profile').length).toBe(9);
  });

  it('applies filters from the URL', async () => {
    renderAt(<TutorsPage />, '/tutors?subject=spanish');
    expect(await screen.findByText('1 tutor found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sofía Martínez' })).toBeInTheDocument();
  });

  it('searches by keyword and shows an empty state', async () => {
    const user = userEvent.setup();
    const { router } = renderAt(<TutorsPage />, '/tutors');
    await screen.findByText(`${demoTutors.length} tutors found`);
    await user.type(screen.getByRole('searchbox'), 'nothing-matches-this');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No tutors match your search')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=nothing-matches-this');
  });

  it('paginates results', async () => {
    const user = userEvent.setup();
    const { router } = renderAt(<TutorsPage />, '/tutors');
    await screen.findByText(`${demoTutors.length} tutors found`);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText(/Page 2 of 2/)).toBeInTheDocument();
  });
});

describe('booking request form', () => {
  beforeEach(() => vi.mocked(createBooking).mockClear());

  it('disables booking for sample profiles', () => {
    renderAt(<BookingRequestForm tutor={demoTutors[0]} />, '/', makeAuth(signedIn('student')));
    expect(screen.getByText(/Booking disabled for sample profiles/)).toBeInTheDocument();
  });

  it('asks signed-out visitors to log in', () => {
    renderAt(<BookingRequestForm tutor={realTutor} />, '/tutors/x');
    expect(screen.getByRole('link', { name: 'Log in to book' })).toHaveAttribute('href', '/login?redirect=%2Ftutors%2Fx');
  });

  it('only lets student accounts request bookings', () => {
    renderAt(<BookingRequestForm tutor={realTutor} />, '/', makeAuth(signedIn('tutor')));
    expect(screen.getByText(/only be sent from student accounts/)).toBeInTheDocument();
  });

  it('validates required fields before sending', async () => {
    const user = userEvent.setup();
    renderAt(<BookingRequestForm tutor={realTutor} />, '/', makeAuth(signedIn('student')));
    await user.click(screen.getByRole('button', { name: /Send booking request/ }));
    expect(screen.getByText('Choose a subject.')).toBeInTheDocument();
    expect(screen.getByText('Choose a date.')).toBeInTheDocument();
    expect(screen.getByText('Choose a preferred time.')).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
    expect(screen.getByText(/not guaranteed until the tutor accepts/)).toBeInTheDocument();
  });

  it('submits a valid request for the signed-in student', async () => {
    const user = userEvent.setup();
    renderAt(<BookingRequestForm tutor={realTutor} />, '/', makeAuth(signedIn('student')));
    await user.selectOptions(screen.getByLabelText(/Subject/), 'sub-2');
    await user.type(screen.getByLabelText(/Preferred date/), '2099-01-05');
    await user.type(screen.getByLabelText(/Preferred time/), '15:30');
    await user.type(screen.getByLabelText(/Message/), 'IELTS help please');
    expect(screen.getByLabelText(/Preferred date/)).toHaveValue('2099-01-05');
    await user.click(screen.getByRole('button', { name: /Send booking request/ }));
    // 2099 is more than 12 months ahead, so the form must refuse it.
    expect(screen.getByText(/within the next 12 months/)).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();

    const date = new Date();
    date.setDate(date.getDate() + 7);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    await user.clear(screen.getByLabelText(/Preferred date/));
    await user.type(screen.getByLabelText(/Preferred date/), iso);
    await user.click(screen.getByRole('button', { name: /Send booking request/ }));
    expect(createBooking).toHaveBeenCalledWith('student-id', realTutor.id, { subjectId: 'sub-2', date: iso, time: '15:30', message: 'IELTS help please' });
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
  });
});
