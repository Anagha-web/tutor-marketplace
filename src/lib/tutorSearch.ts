import type { PublicTutor, TeachingMode } from './types';

export type SortOption = 'experience' | 'price_asc' | 'price_desc' | 'newest';

export interface TutorFilters {
  q: string;
  subject: string;
  mode: '' | Exclude<TeachingMode, 'both'>;
  minRate: number | null;
  maxRate: number | null;
  minExperience: number | null;
  sort: SortOption;
  page: number;
}

export const PAGE_SIZE = 9;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'experience', label: 'Most experienced' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest tutors' },
];

export const DEFAULT_FILTERS: TutorFilters = {
  q: '',
  subject: '',
  mode: '',
  minRate: null,
  maxRate: null,
  minExperience: null,
  sort: 'experience',
  page: 1,
};

function num(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function filtersFromParams(params: URLSearchParams): TutorFilters {
  const mode = params.get('mode');
  const sort = params.get('sort') as SortOption | null;
  const page = Math.floor(num(params.get('page')) ?? 1);
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    subject: (params.get('subject') ?? '').slice(0, 60),
    mode: mode === 'online' || mode === 'in_person' ? mode : '',
    minRate: num(params.get('minRate')),
    maxRate: num(params.get('maxRate')),
    minExperience: num(params.get('minExperience')),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortOption) : 'experience',
    page: page >= 1 ? page : 1,
  };
}

export function filtersToParams(f: TutorFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.subject) p.set('subject', f.subject);
  if (f.mode) p.set('mode', f.mode);
  if (f.minRate != null) p.set('minRate', String(f.minRate));
  if (f.maxRate != null) p.set('maxRate', String(f.maxRate));
  if (f.minExperience != null) p.set('minExperience', String(f.minExperience));
  if (f.sort !== 'experience') p.set('sort', f.sort);
  if (f.page > 1) p.set('page', String(f.page));
  return p;
}

export function activeFilterCount(f: TutorFilters): number {
  return [f.q.trim(), f.subject, f.mode, f.minRate, f.maxRate, f.minExperience].filter((v) => v !== '' && v != null).length;
}

/**
 * In-memory equivalent of public.search_tutors(), used for bundled sample data in demo mode.
 * Keep the semantics in sync with the SQL function.
 */
export function searchTutorList(
  tutors: PublicTutor[],
  f: TutorFilters,
  pageSize = PAGE_SIZE,
): { items: PublicTutor[]; total: number } {
  const q = f.q.trim().toLowerCase();
  const filtered = tutors.filter((t) => {
    if (f.mode && t.teaching_mode !== f.mode && t.teaching_mode !== 'both') return false;
    if (f.minRate != null && (t.hourly_rate == null || t.hourly_rate < f.minRate)) return false;
    if (f.maxRate != null && (t.hourly_rate == null || t.hourly_rate > f.maxRate)) return false;
    if (f.minExperience != null && t.experience_years < f.minExperience) return false;
    if (f.subject && !t.subjects.some((s) => s.slug === f.subject)) return false;
    if (q) {
      const haystack = [t.display_name, t.headline, t.bio, ...t.subjects.map((s) => s.name)].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const byName = (a: PublicTutor, b: PublicTutor) =>
    b.experience_years - a.experience_years || a.display_name.localeCompare(b.display_name);
  const rate = (t: PublicTutor) => t.hourly_rate ?? Number.POSITIVE_INFINITY;
  const sorted = [...filtered].sort((a, b) => {
    switch (f.sort) {
      case 'price_asc':
        return rate(a) - rate(b) || byName(a, b);
      case 'price_desc':
        return (b.hourly_rate ?? -1) - (a.hourly_rate ?? -1) || byName(a, b);
      case 'newest':
        return tutors.indexOf(b) - tutors.indexOf(a);
      default:
        return byName(a, b);
    }
  });

  const start = (Math.max(1, f.page) - 1) * pageSize;
  return { items: sorted.slice(start, start + pageSize), total: sorted.length };
}
