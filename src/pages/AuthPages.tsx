import { BookOpen, GraduationCap, MailCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ConfigRequired } from '../components/ProtectedRoute';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Feedback';
import { Checkbox, TextField } from '../components/ui/Field';
import { useAuth, type SignupRole } from '../context/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { GENERIC_LOGIN_ERROR, GENERIC_SIGNUP_ERROR } from '../lib/errors';
import { dashboardPath, safeRedirect } from '../lib/routes';
import { hasErrors, MIN_PASSWORD_LENGTH, validateLogin, validateRegistration, type FieldErrors, type LoginInput, type RegisterInput } from '../lib/validation';

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </div>
  );
}

export function LoginPage() {
  useDocumentTitle('Log in');
  const { configured, signIn, session, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const [values, setValues] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session && profile) navigate(redirect ?? dashboardPath(profile.role), { replace: true });
  }, [session, profile, redirect, navigate]);

  if (!configured) return <ConfigRequired />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const next = validateLogin(values);
    setErrors(next);
    if (hasErrors(next)) return;
    setSubmitting(true);
    const { ok } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (!ok) setError(GENERIC_LOGIN_ERROR);
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your student, tutor or admin account."
      footer={
        <>
          New to TutorHub?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          error={errors.password}
        />
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}

const emptyRegistration: RegisterInput = { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false };

export function RegisterPage() {
  const [params, setParams] = useSearchParams();
  const role: SignupRole = params.get('role') === 'tutor' ? 'tutor' : 'student';
  useDocumentTitle(role === 'tutor' ? 'Become a tutor' : 'Create an account');
  const { configured, signUp, session, profile } = useAuth();
  const navigate = useNavigate();
  const redirect = safeRedirect(params.get('redirect'));
  const [values, setValues] = useState<RegisterInput>(emptyRegistration);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (session && profile) navigate(redirect ?? dashboardPath(profile.role), { replace: true });
  }, [session, profile, redirect, navigate]);

  if (!configured) return <ConfigRequired />;

  if (confirmationSent) {
    return (
      <AuthCard title="Check your email" subtitle="One more step to finish signing up." footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Go to log in</Link>}>
        <div className="flex flex-col items-center text-center">
          <MailCheck className="size-12 text-brand-600" aria-hidden />
          <p className="mt-4 text-sm text-slate-600">
            If <strong>{values.email}</strong> can be registered, we've sent a confirmation link to it. Open the link, then log in.
          </p>
        </div>
      </AuthCard>
    );
  }

  const set = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setRole = (next: SignupRole) => {
    const p = new URLSearchParams(params);
    if (next === 'tutor') p.set('role', 'tutor');
    else p.delete('role');
    setParams(p, { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const next = validateRegistration(values);
    setErrors(next);
    if (hasErrors(next)) return;
    setSubmitting(true);
    const result = await signUp({ fullName: values.fullName, email: values.email, password: values.password, role });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? GENERIC_SIGNUP_ERROR);
      return;
    }
    if (result.needsConfirmation) setConfirmationSent(true);
  };

  return (
    <AuthCard
      title={role === 'tutor' ? 'Create your tutor account' : 'Create your student account'}
      subtitle={role === 'tutor' ? 'Build your profile, submit it for review and start receiving requests.' : 'Find tutors and send booking requests.'}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div role="radiogroup" aria-label="Account type" className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {(
          [
            ['student', 'I want to learn', BookOpen],
            ['tutor', 'I want to teach', GraduationCap],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            onClick={() => setRole(value)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              role === value ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Full name" autoComplete="name" required maxLength={80} value={values.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} />
        <TextField label="Email" type="email" autoComplete="email" required value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={(e) => set('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />
        <Checkbox
          checked={values.acceptTerms}
          onChange={(e) => set('acceptTerms', e.target.checked)}
          error={errors.acceptTerms}
          label={
            <>
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-brand-700 underline" target="_blank">
                Terms of service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-brand-700 underline" target="_blank">
                Privacy policy
              </Link>
              .
            </>
          }
        />
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          {role === 'tutor' ? 'Create tutor account' : 'Create student account'}
        </Button>
      </form>
    </AuthCard>
  );
}
