import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** Debounced search box + filter slot used above admin tables. */
export function AdminToolbar({ query, onQuery, placeholder, children }: { query: string; onQuery: (q: string) => void; placeholder: string; children?: ReactNode }) {
  const [draftState, setDraftState] = useState({ base: query, value: query });
  const draft = draftState.base === query ? draftState.value : query;
  const setDraft = (value: string) => setDraftState({ base: query, value });
  useEffect(() => {
    if (draft === query) return;
    const t = setTimeout(() => onQuery(draft), 350);
    return () => clearTimeout(t);
  }, [draft, query, onQuery]);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="relative flex-1">
        <label htmlFor="admin-search" className="sr-only">
          Search
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="admin-search"
          type="search"
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>
      {children}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h, i) => (
              <th key={h || i} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
