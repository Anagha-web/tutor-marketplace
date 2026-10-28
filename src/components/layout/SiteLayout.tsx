import { GraduationCap, LayoutDashboard, LogOut, Mail, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../../config/site';
import { useAuth } from '../../context/auth';
import { dashboardPath } from '../../lib/routes';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ButtonLink, Button } from '../ui/Button';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-lg" aria-label={`${site.name} home`}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Tutor<span className={light ? 'text-amber-300' : 'text-brand-700'}>Hub</span>
      </span>
    </Link>
  );
}

const navLinks = [
  { to: '/tutors', label: 'Find tutors' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function Header() {
  const { session, profile, signOut } = useAuth();
  const location = useLocation();
  // The menu is tied to the location it was opened on, so navigating closes it automatically.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              <ButtonLink to={dashboardPath(profile?.role)} variant="secondary" icon={<LayoutDashboard className="size-4" aria-hidden />}>
                Dashboard
              </ButtonLink>
              <Button variant="ghost" onClick={handleSignOut} icon={<LogOut className="size-4" aria-hidden />}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <ButtonLink to="/register?role=tutor" variant="ghost">
                Become a tutor
              </ButtonLink>
              <ButtonLink to="/login" variant="outline">
                Log in
              </ButtonLink>
              <ButtonLink to="/register">Sign up</ButtonLink>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpenAt(open ? null : location.key)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-5 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} end>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-4">
            {session ? (
              <>
                <ButtonLink to={dashboardPath(profile?.role)} variant="secondary">
                  Dashboard
                </ButtonLink>
                <Button variant="outline" onClick={handleSignOut}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <ButtonLink to="/register">Sign up as a student</ButtonLink>
                <ButtonLink to="/register?role=tutor" variant="secondary">
                  Become a tutor
                </ButtonLink>
                <ButtonLink to="/login" variant="outline">
                  Log in
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            A marketplace connecting students with independent tutors for online and in-person lessons.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/tutors">Find a tutor</Link></li>
            <li><Link className="hover:text-white" to="/register?role=tutor">Become a tutor</Link></li>
            <li><Link className="hover:text-white" to="/about">About us</Link></li>
            <li><Link className="hover:text-white" to="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-white" to="/terms">Terms of service</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="inline-flex items-center gap-2 hover:text-white" href={`mailto:${site.contactEmail}`}>
                <Mail className="size-4" aria-hidden />
                {site.contactEmail}
              </a>
            </li>
            <li className="text-slate-400">{site.supportHours}</li>
            <li><Link className="hover:text-white" to="/contact">Contact form</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
          © {year} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      <strong>Demo mode:</strong> Supabase is not configured, so tutors shown are fictional sample profiles and sign-in is disabled.
    </div>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <ScrollManager />
      <DemoBanner />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
