import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';
import HomePage from '../../src/pages/HomePage';
import { AboutPage, ContactPage, NotFoundPage, PrivacyPage, TermsPage } from '../../src/pages/info/InfoPages';
import TutorProfilePage from '../../src/pages/TutorProfilePage';
import { makeAuth, renderAt, renderRoutes } from './helpers';

describe('page smoke tests (demo mode)', () => {
  it('boots the full app on the home page', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: /Find a tutor you'll love learning with/ })).toBeInTheDocument();
  });

  it('renders the home page sections with labelled sample content', async () => {
    renderAt(<HomePage />, '/');
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Mathematics' })).toBeInTheDocument();
    expect(screen.getByText(/Sample testimonials — illustrative only/)).toBeInTheDocument();
    expect(await screen.findAllByText('Sample profile')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: /From search to lesson/ })).toBeInTheDocument();
  });

  it('renders a sample tutor profile with a disclaimer', async () => {
    renderRoutes([{ path: '/tutors/:id', element: <TutorProfilePage /> }], '/tutors/demo-priya-raman', makeAuth({ configured: false }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Priya Raman' })).toBeInTheDocument();
    expect(screen.getByText(/fictional profile shown for demonstration/)).toBeInTheDocument();
    expect(screen.getByText(/Not independently verified/)).toBeInTheDocument();
  });

  it('shows not-found for unknown tutors', async () => {
    renderRoutes([{ path: '/tutors/:id', element: <TutorProfilePage /> }], '/tutors/nope', makeAuth());
    expect(await screen.findByText('Tutor not found')).toBeInTheDocument();
  });

  it.each([
    ['About', <AboutPage />, /About TutorHub/],
    ['Contact', <ContactPage />, /Contact us/],
    ['Privacy', <PrivacyPage />, /Privacy policy/],
    ['Terms', <TermsPage />, /Terms of service/],
    ['Not found', <NotFoundPage />, /couldn't find that page/],
  ])('renders the %s page', (_name, element, heading) => {
    renderAt(element, '/');
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
