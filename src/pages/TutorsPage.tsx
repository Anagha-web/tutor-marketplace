import { Search, SlidersHorizontal, UserSearch, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TutorCard } from '../components/TutorCard';
import { Button } from '../components/ui/Button';
import { Alert, EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback';
import { SelectField, TextField } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { activeFilterCount, DEFAULT_FILTERS, filtersFromParams, filtersToParams, PAGE_SIZE, SORT_OPTIONS, type TutorFilters } from '../lib/tutorSearch';
import { listSubjects, searchTutors } from '../services/catalog';

export default function TutorsPage() {
  useDocumentTitle('Find a tutor');
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const key = filtersToParams(filters).toString();
  const [showFilters, setShowFilters] = useState(false);
  // The draft resets whenever the URL query changes (e.g. back/forward navigation).
  const [draft, setDraft] = useState({ base: filters.q, value: filters.q });
  const queryDraft = draft.base === filters.q ? draft.value : filters.q;
  const setQueryDraft = (value: string) => setDraft({ base: filters.q, value });

  const subjects = useAsync(() => listSubjects(), []);
  const results = useAsync(() => searchTutors(filters), [key]);

  const update = (patch: Partial<TutorFilters>) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setParams(filtersToParams(next));
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: queryDraft });
  };

  const numberOrNull = (v: string) => (v === '' ? null : Math.max(0, Number(v)));
  const count = activeFilterCount(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Find a tutor</h1>
        <p className="mt-1 text-slate-600">Search approved tutors by subject, teaching mode, price and experience.</p>
      </header>

      <form onSubmit={onSearch} role="search" className="mb-6 flex gap-2">
        <label htmlFor="tutor-search" className="sr-only">
          Search tutors
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="tutor-search"
            type="search"
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            maxLength={80}
            placeholder="Search by name, keyword or subject"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <Button type="submit" size="lg">
          Search
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="lg:hidden"
          aria-expanded={showFilters}
          aria-controls="tutor-filters"
          onClick={() => setShowFilters((s) => !s)}
          icon={<SlidersHorizontal className="size-5" aria-hidden />}
        >
          <span className="sr-only sm:not-sr-only">Filters{count ? ` (${count})` : ''}</span>
        </Button>
      </form>

      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside id="tutor-filters" className={`${showFilters ? 'block' : 'hidden'} mb-6 lg:mb-0 lg:block`} aria-label="Filters">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Filters</h2>
              {count > 0 && (
                <button type="button" onClick={() => setParams(filtersToParams({ ...DEFAULT_FILTERS, sort: filters.sort }))} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                  <X className="size-4" aria-hidden /> Clear all
                </button>
              )}
            </div>
            <SelectField label="Subject" value={filters.subject} onChange={(e) => update({ subject: e.target.value })} disabled={subjects.loading}>
              <option value="">All subjects</option>
              {subjects.data?.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Teaching mode" value={filters.mode} onChange={(e) => update({ mode: e.target.value as TutorFilters['mode'] })}>
              <option value="">Any</option>
              <option value="online">Online</option>
              <option value="in_person">In person</option>
            </SelectField>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Hourly rate</legend>
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Min" type="number" min={0} inputMode="numeric" value={filters.minRate ?? ''} onChange={(e) => update({ minRate: numberOrNull(e.target.value) })} />
                <TextField label="Max" type="number" min={0} inputMode="numeric" value={filters.maxRate ?? ''} onChange={(e) => update({ maxRate: numberOrNull(e.target.value) })} />
              </div>
            </fieldset>
            <SelectField
              label="Experience"
              value={filters.minExperience ?? ''}
              onChange={(e) => update({ minExperience: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">Any experience</option>
              <option value="1">1+ years</option>
              <option value="3">3+ years</option>
              <option value="5">5+ years</option>
              <option value="10">10+ years</option>
            </SelectField>
          </div>
        </aside>

        <section aria-labelledby="results-heading" aria-busy={results.loading}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="results-heading" className="text-sm text-slate-600" aria-live="polite">
              {results.loading ? 'Searching…' : results.data ? `${results.data.total} ${results.data.total === 1 ? 'tutor' : 'tutors'} found` : ''}
            </h2>
            <SelectField label="Sort by" wrapperClassName="sm:w-56 [&>label]:sr-only" value={filters.sort} onChange={(e) => update({ sort: e.target.value as TutorFilters['sort'] })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          {results.data?.demo && (
            <Alert tone="warning" className="mb-4">
              Demo mode: these are fictional sample tutors, not real people.
            </Alert>
          )}

          {results.loading && !results.data ? (
            <LoadingState label="Finding tutors" />
          ) : results.error ? (
            <ErrorState error={results.error} onRetry={results.reload} />
          ) : !results.data?.items.length ? (
            <EmptyState
              icon={<UserSearch className="size-6" />}
              title="No tutors match your search"
              action={
                count > 0 ? (
                  <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            >
              Try a different keyword or remove some filters.
            </EmptyState>
          ) : (
            <>
              <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${results.loading ? 'opacity-60' : ''}`}>
                {results.data.items.map((t) => (
                  <TutorCard key={t.id} tutor={t} />
                ))}
              </div>
              <Pagination
                page={filters.page}
                pageSize={PAGE_SIZE}
                total={results.data.total}
                onChange={(page) => {
                  update({ page });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
