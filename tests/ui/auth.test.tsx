import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage, RegisterPage } from '../../src/pages/AuthPages';
import { makeAuth, renderAt, renderRoutes, signedIn } from './helpers';
import type { AuthContextValue } from '../../src/context/auth';

const renderLogin = (url: string, auth: AuthContextValue) =>
  renderRoutes([{ path: '/login', element: <LoginPage /> }, { path: '*', element: <p>Elsewhere</p> }], url, auth);

async function fillRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full name/), 'Tara Tutor');
  await user.type(screen.getByLabelText(/^Email/), 'tara@example.com');
  await user.type(screen.getByLabelText(/^Password/), 'secret123');
  await user.type(screen.getByLabelText(/Confirm password/), 'secret123');
  await user.click(screen.getByRole('checkbox'));
}

describe('registration', () => {
  it('shows validation errors and does not call signUp for invalid input', async () => {
    const auth = makeAuth();
    const user = userEvent.setup();
    renderAt(<RegisterPage />, '/register', auth);
    await user.click(screen.getByRole('button', { name: /Create student account/ }));
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Please accept the terms to continue.')).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('registers a student by default and shows the email confirmation step', async () => {
    const auth = makeAuth();
    const user = userEvent.setup();
    renderAt(<RegisterPage />, '/register', auth);
    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: /Create student account/ }));
    expect(auth.signUp).toHaveBeenCalledWith({ fullName: 'Tara Tutor', email: 'tara@example.com', password: 'secret123', role: 'student' });
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
  });

  it('requests the tutor role from ?role=tutor and offers only student/tutor', async () => {
    const auth = makeAuth();
    const user = userEvent.setup();
    renderAt(<RegisterPage />, '/register?role=tutor', auth);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: /Create tutor account/ }));
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ role: 'tutor' }));
  });

  it('shows a generic error when signup fails', async () => {
    const auth = makeAuth({ signUp: vi.fn(async () => ({ ok: false, needsConfirmation: false })) });
    const user = userEvent.setup();
    renderAt(<RegisterPage />, '/register', auth);
    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: /Create student account/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not create your account/);
  });
});

describe('login', () => {
  it('uses a generic message for failed logins', async () => {
    const auth = makeAuth({ signIn: vi.fn(async () => ({ ok: false })) });
    const user = userEvent.setup();
    renderLogin('/login', auth);
    await user.type(screen.getByLabelText(/Email/), 'someone@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(auth.signIn).toHaveBeenCalledWith('someone@example.com', 'wrongpass1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password, or your email is not yet confirmed.');
  });

  it('validates before calling signIn', async () => {
    const auth = makeAuth();
    const user = userEvent.setup();
    renderLogin('/login', auth);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('sends signed-in users to a safe redirect or their dashboard', async () => {
    const { router } = renderLogin('/login?redirect=//evil.example', makeAuth(signedIn('tutor')));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor'));
  });

  it('shows a configuration message when Supabase is missing', () => {
    renderLogin('/login', makeAuth({ configured: false }));
    expect(screen.getByText(/Accounts are not available yet/)).toBeInTheDocument();
  });
});
