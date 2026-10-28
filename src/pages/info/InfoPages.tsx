import { Compass, Mail, MapPin, Send, Clock } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { site } from '../../config/site';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { isValidEmail } from '../../lib/validation';

function Prose({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-slate-600">{intro}</p>}
      <div className="mt-8 space-y-6 leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}

export function AboutPage() {
  useDocumentTitle('About us');
  return (
    <Prose title={`About ${site.name}`} intro="We make it simple for students to find independent tutors, and for tutors to grow their teaching practice.">
      <p>
        {site.name} is a marketplace for independent tutors. Each tutor manages their own profile, subjects, teaching style and hourly rate. Students
        browse approved profiles and send booking requests directly to the tutor they choose.
      </p>
      <h2>How we review tutors</h2>
      <p>
        New tutor profiles are reviewed by our team before they appear in search. Reviews check that a profile is complete and appropriate. In this
        version, qualifications are self-reported by tutors and are not independently verified.
      </p>
      <h2>Booking requests, not guaranteed slots</h2>
      <p>
        Bookings start as requests. A lesson is only arranged once the tutor accepts. Payments are agreed directly between students and tutors; we
        do not collect payment details.
      </p>
      <div className="flex flex-wrap gap-3 pt-4">
        <ButtonLink to="/tutors">Find a tutor</ButtonLink>
        <ButtonLink to="/register?role=tutor" variant="outline">
          Become a tutor
        </ButtonLink>
      </div>
    </Prose>
  );
}

export function ContactPage() {
  useDocumentTitle('Contact us');
  const [values, setValues] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [opened, setOpened] = useState(false);

  // No message storage in v1: the form composes an email in the visitor's mail app.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = 'Enter your name.';
    if (!isValidEmail(values.email)) next.email = 'Enter a valid email address.';
    if (values.message.trim().length < 10) next.message = 'Tell us a little more (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = `${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`;
    window.location.href = `mailto:${site.contactEmail}?subject=${encodeURIComponent(`${site.name} enquiry`)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Contact us</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">Questions about tutoring, your account or becoming a tutor? We're happy to help.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <ul className="space-y-4">
          <ContactItem icon={<Mail className="size-5" />} label="Email">
            <a href={`mailto:${site.contactEmail}`} className="text-brand-700 hover:underline">
              {site.contactEmail}
            </a>
          </ContactItem>
          <ContactItem icon={<Clock className="size-5" />} label="Support hours">
            {site.supportHours}
          </ContactItem>
          <ContactItem icon={<MapPin className="size-5" />} label="Address">
            {site.address}
          </ContactItem>
        </ul>
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {opened && <Alert tone="success">Your email app should now open with your message. If it didn't, email us at {site.contactEmail}.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" required autoComplete="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} error={errors.name} />
            <TextField
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              error={errors.email}
            />
          </div>
          <TextAreaField
            label="Message"
            required
            rows={5}
            maxLength={2000}
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            error={errors.message}
          />
          <Button type="submit" icon={<Send className="size-4" aria-hidden />}>
            Compose email
          </Button>
          <p className="text-xs text-slate-500">This opens your email app. We don't store messages sent through this form.</p>
        </form>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="h-fit rounded-xl bg-brand-50 p-2.5 text-brand-700" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <div className="mt-0.5 text-sm text-slate-600">{children}</div>
      </div>
    </li>
  );
}

const draftNotice = (
  <Alert tone="warning" title="Template — review before launch">
    This page is a starting template, not legal advice. Have it reviewed and adapted for your business and jurisdiction.
  </Alert>
);

export function PrivacyPage() {
  useDocumentTitle('Privacy policy');
  return (
    <Prose title="Privacy policy" intro="How we collect, use and protect your information.">
      {draftNotice}
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: name, email address and, optionally, a phone number.</li>
        <li>Tutor profile details that tutors choose to publish, such as biography, subjects, qualifications and rates.</li>
        <li>Booking requests: subject, requested date and time, and any message you include.</li>
      </ul>
      <h2>How we use it</h2>
      <p>We use your information to operate your account, show tutor profiles, deliver booking requests and keep the marketplace safe.</p>
      <h2>Who can see your information</h2>
      <ul>
        <li>Your email and phone number are private. They are not shown on public profiles.</li>
        <li>When a tutor accepts a booking request, the student and tutor can see each other's account email for that booking.</li>
        <li>Platform administrators can view account and booking records to operate and moderate the service.</li>
      </ul>
      <h2>Payments</h2>
      <p>We do not collect or store payment card details.</p>
      <h2>Your choices</h2>
      <p>You can update your name and phone number in your dashboard. To request deletion of your account, contact {site.contactEmail}.</p>
    </Prose>
  );
}

export function TermsPage() {
  useDocumentTitle('Terms of service');
  return (
    <Prose title="Terms of service" intro={`The rules for using ${site.name}.`}>
      {draftNotice}
      <h2>The service</h2>
      <p>
        {site.name} lets students find independent tutors and send booking requests. Tutors are independent and not employees of {site.name}. A
        booking request is not a confirmed lesson until the tutor accepts it.
      </p>
      <h2>Accounts</h2>
      <ul>
        <li>Provide accurate information and keep your password secure.</li>
        <li>Tutors are responsible for the accuracy of their profiles, including qualifications.</li>
        <li>We may review, suspend or deactivate profiles and accounts that break these terms.</li>
      </ul>
      <h2>Payments</h2>
      <p>No payments are processed through the site in this version. Any fees are agreed directly between students and tutors.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the service, harass others, post misleading content or attempt to access data that is not yours.</p>
    </Prose>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="rounded-full bg-brand-50 p-4 text-brand-700">
        <Compass className="size-10" aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">We couldn't find that page</h1>
      <p className="mt-3 text-slate-600">The link may be broken, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Go home</ButtonLink>
        <ButtonLink to="/tutors" variant="outline">
          Find a tutor
        </ButtonLink>
      </div>
    </div>
  );
}
