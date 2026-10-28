import { Briefcase, MapPin, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRate, teachingModeLabel } from '../lib/format';
import type { PublicTutor } from '../lib/types';
import { Avatar } from './ui/Avatar';
import { SampleBadge } from './ui/Badge';

export function TutorCard({ tutor }: { tutor: PublicTutor }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <Avatar name={tutor.display_name} src={tutor.avatar_url} />
        <div className="min-w-0 flex-1">
          {tutor.isDemo && <SampleBadge />}
          <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
            <Link to={`/tutors/${tutor.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
              {tutor.display_name}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm text-slate-600">{tutor.headline || 'Independent tutor'}</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Subjects">
        {tutor.subjects.slice(0, 4).map((s) => (
          <li key={s.id} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
            {s.name}
          </li>
        ))}
        {tutor.subjects.length > 4 && <li className="px-1 text-xs text-slate-500">+{tutor.subjects.length - 4} more</li>}
      </ul>

      <dl className="mt-4 grid flex-1 grid-cols-2 content-start gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Teaching mode</dt>
          <Monitor className="size-4 text-slate-400" aria-hidden />
          <dd>{teachingModeLabel[tutor.teaching_mode]}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Experience</dt>
          <Briefcase className="size-4 text-slate-400" aria-hidden />
          <dd>
            {tutor.experience_years} {tutor.experience_years === 1 ? 'year' : 'years'} experience
          </dd>
        </div>
        {tutor.location && tutor.teaching_mode !== 'online' && (
          <div className="col-span-2 flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            <MapPin className="size-4 text-slate-400" aria-hidden />
            <dd>{tutor.location}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-lg font-bold text-slate-900">{formatRate(tutor.hourly_rate)}</p>
        <span className="text-sm font-semibold text-brand-700 group-hover:underline">View profile →</span>
      </div>
    </article>
  );
}
