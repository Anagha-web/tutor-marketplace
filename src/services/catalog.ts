import { demoSubjects, demoTutors } from '../data/demo';
import { supabase } from '../lib/supabase';
import { PAGE_SIZE, searchTutorList, type TutorFilters } from '../lib/tutorSearch';
import type { PublicTutor, Subject, SubjectRef } from '../lib/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TutorSearchResult {
  items: PublicTutor[];
  total: number;
  demo: boolean;
}

interface SearchRow extends Omit<PublicTutor, 'subjects' | 'isDemo'> {
  subjects: SubjectRef[];
  total_count: number;
}

export async function searchTutors(f: TutorFilters, pageSize = PAGE_SIZE): Promise<TutorSearchResult> {
  if (!supabase) return { ...searchTutorList(demoTutors, f, pageSize), demo: true };

  const { data, error } = await supabase.rpc('search_tutors', {
    p_query: f.q.trim() || null,
    p_subject_slug: f.subject || null,
    p_mode: f.mode || null,
    p_min_rate: f.minRate,
    p_max_rate: f.maxRate,
    p_min_experience: f.minExperience,
    p_sort: f.sort,
    p_limit: pageSize,
    p_offset: (f.page - 1) * pageSize,
  });
  if (error) throw error;
  const rows = (data ?? []) as SearchRow[];
  return {
    items: rows.map(({ total_count: _total, ...t }) => ({ ...t, hourly_rate: t.hourly_rate == null ? null : Number(t.hourly_rate) })),
    total: rows.length ? Number(rows[0].total_count) : 0,
    demo: false,
  };
}

interface TutorRow extends Omit<PublicTutor, 'subjects' | 'isDemo'> {
  tutor_subjects: { subject: (SubjectRef & { is_active: boolean }) | null }[];
}

/** Returns a publicly visible tutor, or null if not found / not approved. */
export async function getPublicTutor(id: string): Promise<PublicTutor | null> {
  if (!supabase) return demoTutors.find((t) => t.id === id) ?? null;
  if (!UUID_RE.test(id)) return null;

  const { data, error } = await supabase
    .from('tutor_profiles')
    .select(
      'id, display_name, headline, bio, qualifications, experience_years, hourly_rate, teaching_mode, location, avatar_url, tutor_subjects(subject:subjects(id, name, slug, is_active))',
    )
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as TutorRow;
  const { tutor_subjects, ...rest } = row;
  return {
    ...rest,
    hourly_rate: rest.hourly_rate == null ? null : Number(rest.hourly_rate),
    subjects: tutor_subjects
      .map((ts) => ts.subject)
      .filter((x): x is SubjectRef & { is_active: boolean } => !!x && x.is_active)
      .map(({ id: sid, name, slug }) => ({ id: sid, name, slug }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function listSubjects(includeInactive = false): Promise<Subject[]> {
  if (!supabase) return demoSubjects;
  let query = supabase.from('subjects').select('id, name, slug, description, is_active').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Subject[];
}
