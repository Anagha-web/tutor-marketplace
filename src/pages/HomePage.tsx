import {
  Atom,
  BookOpen,
  Calculator,
  CalendarCheck,
  Code2,
  FlaskConical,
  Globe2,
  Landmark,
  LineChart,
  Microscope,
  Music,
  PenLine,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TutorCard } from '../components/TutorCard';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback';
import { sampleTestimonials } from '../data/demo';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { DEFAULT_FILTERS } from '../lib/tutorSearch';
import { listSubjects, searchTutors } from '../services/catalog';

const subjectIcons: Record<string, LucideIcon> = {
  mathematics: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Microscope,
  english: PenLine,
  'computer-science': Code2,
  spanish: Globe2,
  french: Globe2,
  history: Landmark,
  economics: LineChart,
  music: Music,
};

const steps = [
  { icon: Search, title: 'Search and compare', text: 'Filter tutors by subject, price, experience and whether they teach online or in person.' },
  { icon: CalendarCheck, title: 'Send a request', text: 'Pick a subject, preferred date and time, and tell the tutor what you want to achieve.' },
  { icon: UserCheck, title: 'Get a response', text: 'Your tutor accepts or declines, and you can follow every request from your dashboard.' },
];

const benefits = [
  { icon: ShieldCheck, title: 'Reviewed profiles', text: 'Every tutor profile is reviewed by our team before it appears in search.' },
  { icon: Users, title: 'Independent tutors', text: 'Tutors run their own profiles and set their own prices and teaching style.' },
  { icon: Sparkles, title: 'Simple and transparent', text: 'Clear hourly rates, clear request statuses, and no payment details collected on the site.' },
];

export default function HomePage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const subjects = useAsync(() => listSubjects(), []);
  const featured = useAsync(() => searchTutors({ ...DEFAULT_FILTERS }, 3), []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/tutors?q=${encodeURIComponent(q)}` : '/tutors');
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-amber-300/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-brand-100 ring-1 ring-white/20">
              <BookOpen className="size-4" aria-hidden /> Online and in-person tutoring
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Find a tutor you'll <span className="text-amber-300">love</span> learning with.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-brand-100">
              Browse independent tutors, compare subjects and rates, and send a booking request in minutes.
            </p>
            <form onSubmit={onSearch} role="search" className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
              <label htmlFor="hero-search" className="sr-only">
                Search tutors by subject or name
              </label>
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “algebra”, “Spanish” or a tutor’s name"
                  className="h-12 w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <Button type="submit" size="lg" variant="accent">
                Search tutors
              </Button>
            </form>
            <p className="mt-4 text-sm text-brand-200">
              Are you a tutor?{' '}
              <Link to="/register?role=tutor" className="font-semibold text-white underline underline-offset-4">
                Create your free profile
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Popular subjects */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Subjects" title="Popular subjects" text="Start with a subject and narrow down from there." />
        {subjects.loading ? (
          <LoadingState label="Loading subjects" />
        ) : subjects.error ? (
          <ErrorState error={subjects.error} onRetry={subjects.reload} />
        ) : !subjects.data?.length ? (
          <EmptyState title="No subjects yet">Subjects will appear here once they are added.</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {subjects.data.slice(0, 12).map((s) => {
              const Icon = subjectIcons[s.slug] ?? BookOpen;
              return (
                <li key={s.id}>
                  <Link
                    to={`/tutors?subject=${s.slug}`}
                    className="flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  >
                    <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Featured tutors */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Tutors" title="Featured tutors" text={featured.data?.demo ? 'Fictional sample profiles shown in demo mode.' : 'A few of the tutors available right now.'} />
            <ButtonLink to="/tutors" variant="outline" className="mb-8 self-start sm:self-auto">
              Browse all tutors
            </ButtonLink>
          </div>
          {featured.loading ? (
            <LoadingState label="Loading tutors" />
          ) : featured.error ? (
            <ErrorState error={featured.error} onRetry={featured.reload} />
          ) : !featured.data?.items.length ? (
            <EmptyState title="Tutors are joining soon" action={<ButtonLink to="/register?role=tutor">Become a tutor</ButtonLink>}>
              No tutor profiles have been approved yet.
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data.items.map((t) => (
                <TutorCard key={t.id} tutor={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How it works" title="From search to lesson in three steps" centered />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-slate-100" aria-hidden>
                {i + 1}
              </span>
              <span className="inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits + testimonials */}
      <section className="bg-brand-50/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why TutorHub" title="Built for students and tutors" centered />
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <Icon className="size-7 text-brand-700" aria-hidden />
                <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-center text-lg font-bold text-slate-900">What people could say</h3>
            <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wide text-amber-700">Sample testimonials — illustrative only, not real reviews</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {sampleTestimonials.map((t) => (
                <figure key={t.name} className="rounded-2xl border border-dashed border-brand-200 bg-white p-6">
                  <Quote className="size-6 text-brand-300" aria-hidden />
                  <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">{t.quote}</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    <span className="text-slate-500"> · {t.detail}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-brand-700 p-8 text-white sm:p-10">
            <h2 className="text-2xl font-bold">Ready to start learning?</h2>
            <p className="mt-2 text-brand-100">Create a free student account and send your first booking request today.</p>
            <ButtonLink to="/register" variant="accent" size="lg" className="mt-6">
              Join as a student
            </ButtonLink>
          </div>
          <div className="rounded-3xl bg-amber-100 p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">Teach on TutorHub</h2>
            <p className="mt-2 text-slate-700">Set your own rates, describe your teaching style and manage requests from your own dashboard.</p>
            <ButtonLink to="/register?role=tutor" size="lg" className="mt-6">
              Become a tutor
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, text, centered }: { eyebrow: string; title: string; text?: string; centered?: boolean }) {
  return (
    <div className={`mb-8 ${centered ? 'text-center' : ''}`}>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
      {text && <p className="mt-2 text-slate-600">{text}</p>}
    </div>
  );
}
