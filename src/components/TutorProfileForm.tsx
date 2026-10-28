import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { friendlyError } from '../lib/errors';
import { MIN_BIO_LENGTH } from '../lib/tutorRules';
import type { Subject } from '../lib/types';
import { hasErrors, validateTutorProfile, type FieldErrors, type TutorProfileInput } from '../lib/validation';
import { Button } from './ui/Button';
import { Alert } from './ui/Feedback';
import { SelectField, TextAreaField, TextField } from './ui/Field';

interface TutorProfileFormProps {
  initial: TutorProfileInput;
  initialSubjectIds: string[];
  subjects: Subject[];
  onSave: (values: TutorProfileInput, subjectIds: string[]) => Promise<void>;
}

export function TutorProfileForm({ initial, initialSubjectIds, subjects, onSave }: TutorProfileFormProps) {
  const [values, setValues] = useState(initial);
  const [subjectIds, setSubjectIds] = useState(initialSubjectIds);
  const [errors, setErrors] = useState<FieldErrors<TutorProfileInput>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const set = <K extends keyof TutorProfileInput>(key: K, value: TutorProfileInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setMessage(null);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleSubject = (id: string) => {
    setMessage(null);
    setSubjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  // Keep subjects the tutor already teaches visible even if an admin has since deactivated them.
  const selectable = subjects.filter((s) => s.is_active || subjectIds.includes(s.id));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateTutorProfile(values);
    setErrors(next);
    if (hasErrors(next)) {
      setMessage({ tone: 'error', text: 'Please fix the highlighted fields.' });
      return;
    }
    setSaving(true);
    try {
      await onSave(values, subjectIds);
      setMessage({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: friendlyError(err, 'Could not save the profile.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Display name" required maxLength={80} value={values.display_name} onChange={(e) => set('display_name', e.target.value)} error={errors.display_name} />
        <TextField
          label="Headline"
          maxLength={120}
          placeholder="e.g. Patient GCSE maths tutor"
          value={values.headline}
          onChange={(e) => set('headline', e.target.value)}
          error={errors.headline}
        />
      </div>
      <TextAreaField
        label="Biography"
        rows={6}
        maxLength={3000}
        value={values.bio}
        onChange={(e) => set('bio', e.target.value)}
        error={errors.bio}
        hint={`${values.bio.trim().length} characters · at least ${MIN_BIO_LENGTH} needed to submit for review`}
      />
      <TextAreaField
        label="Qualifications"
        rows={3}
        maxLength={1500}
        placeholder="Degrees, certificates and relevant training"
        value={values.qualifications}
        onChange={(e) => set('qualifications', e.target.value)}
        error={errors.qualifications}
        hint="Shown as provided by the tutor. TutorHub does not independently verify qualifications in this version."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Years of experience"
          type="number"
          min={0}
          max={60}
          required
          value={values.experience_years}
          onChange={(e) => set('experience_years', e.target.value)}
          error={errors.experience_years}
        />
        <TextField
          label="Hourly rate"
          type="number"
          min={1}
          max={1000}
          step="0.01"
          inputMode="decimal"
          value={values.hourly_rate}
          onChange={(e) => set('hourly_rate', e.target.value)}
          error={errors.hourly_rate}
        />
        <SelectField label="Teaching mode" value={values.teaching_mode} onChange={(e) => set('teaching_mode', e.target.value as TutorProfileInput['teaching_mode'])}>
          <option value="online">Online</option>
          <option value="in_person">In person</option>
          <option value="both">Online & in person</option>
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {values.teaching_mode !== 'online' && (
          <TextField
            label="Location for in-person lessons"
            required
            maxLength={120}
            placeholder="City or area"
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            error={errors.location}
          />
        )}
        <TextField
          label="Profile photo URL (optional)"
          type="url"
          placeholder="https://…"
          value={values.avatar_url}
          onChange={(e) => set('avatar_url', e.target.value)}
          error={errors.avatar_url}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Subjects taught</legend>
        {selectable.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects are available yet. An administrator needs to add them.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectable.map((s) => {
              const checked = subjectIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                    checked ? 'border-brand-600 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleSubject(s.id)} />
                  {s.name}
                  {!s.is_active && ' (inactive)'}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Button type="submit" loading={saving} icon={<Save className="size-4" aria-hidden />}>
        Save profile
      </Button>
    </form>
  );
}
