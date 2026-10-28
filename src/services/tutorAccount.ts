import { requireSupabase } from '../lib/supabase';
import type { TutorProfile } from '../lib/types';
import type { TutorProfileInput } from '../lib/validation';

export interface TutorProfileWithSubjects extends TutorProfile {
  subjectIds: string[];
}

export async function getTutorProfileByUser(userId: string): Promise<TutorProfileWithSubjects | null> {
  return fetchTutorProfile('user_id', userId);
}

export async function getTutorProfileById(id: string): Promise<TutorProfileWithSubjects | null> {
  return fetchTutorProfile('id', id);
}

async function fetchTutorProfile(column: 'id' | 'user_id', value: string): Promise<TutorProfileWithSubjects | null> {
  const { data, error } = await requireSupabase()
    .from('tutor_profiles')
    .select('*, tutor_subjects(subject_id)')
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { tutor_subjects, ...profile } = data as TutorProfile & { tutor_subjects: { subject_id: string }[] };
  return {
    ...profile,
    hourly_rate: profile.hourly_rate == null ? null : Number(profile.hourly_rate),
    subjectIds: tutor_subjects.map((t) => t.subject_id),
  };
}

export function toProfileInput(p: TutorProfile): TutorProfileInput {
  return {
    display_name: p.display_name,
    headline: p.headline,
    bio: p.bio,
    qualifications: p.qualifications,
    experience_years: String(p.experience_years),
    hourly_rate: p.hourly_rate == null ? '' : String(p.hourly_rate),
    teaching_mode: p.teaching_mode,
    location: p.location,
    avatar_url: p.avatar_url ?? '',
  };
}

/** Saves editable profile fields only. Status and review fields are never sent from here. */
export async function saveTutorProfile(id: string, input: TutorProfileInput, subjectIds: string[], previousSubjectIds: string[]) {
  const db = requireSupabase();
  const { error } = await db
    .from('tutor_profiles')
    .update({
      display_name: input.display_name.trim(),
      headline: input.headline.trim(),
      bio: input.bio.trim(),
      qualifications: input.qualifications.trim(),
      experience_years: Number(input.experience_years),
      hourly_rate: input.hourly_rate === '' ? null : Number(input.hourly_rate),
      teaching_mode: input.teaching_mode,
      location: input.teaching_mode === 'online' ? '' : input.location.trim(),
      avatar_url: input.avatar_url.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;

  const toAdd = subjectIds.filter((s) => !previousSubjectIds.includes(s));
  const toRemove = previousSubjectIds.filter((s) => !subjectIds.includes(s));
  if (toAdd.length) {
    const { error: addError } = await db.from('tutor_subjects').insert(toAdd.map((subject_id) => ({ tutor_id: id, subject_id })));
    if (addError) throw addError;
  }
  if (toRemove.length) {
    const { error: removeError } = await db.from('tutor_subjects').delete().eq('tutor_id', id).in('subject_id', toRemove);
    if (removeError) throw removeError;
  }
}

export async function submitTutorProfileForReview(id: string) {
  const { error } = await requireSupabase().from('tutor_profiles').update({ status: 'pending' }).eq('id', id);
  if (error) throw error;
}
