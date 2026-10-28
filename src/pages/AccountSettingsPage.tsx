import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Card, PageHeader } from '../components/layout/DashboardLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../context/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { friendlyError } from '../lib/errors';
import { formatDate } from '../lib/format';
import { requireSupabase } from '../lib/supabase';

/** Basic account details. Role, email and status are read-only and protected by the database. */
export default function AccountSettingsPage() {
  useDocumentTitle('Account settings');
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  if (!profile) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const next: typeof errors = {};
    if (fullName.trim().length < 2 || fullName.trim().length > 80) next.fullName = 'Enter a name between 2 and 80 characters.';
    if (phone && !/^[+()\d\s-]{6,30}$/.test(phone)) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { error } = await requireSupabase()
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      setMessage({ tone: 'success', text: 'Your details were saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: friendlyError(err, 'Could not save your details.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Account settings" description="Manage your basic account details." />
      <Card className="max-w-2xl">
        <dl className="mb-6 grid gap-4 border-b border-slate-100 pb-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="mt-0.5 break-all font-medium text-slate-900">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Account type</dt>
            <dd className="mt-1">
              <Badge color="brand" className="capitalize">
                {profile.role}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Member since</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{formatDate(profile.created_at)}</dd>
          </div>
        </dl>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <TextField label="Full name" required maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} autoComplete="name" />
          <TextField
            label="Phone (optional)"
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            autoComplete="tel"
            hint="Private. Only you and administrators can see it."
          />
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <Button type="submit" loading={saving} icon={<Save className="size-4" aria-hidden />}>
            Save changes
          </Button>
        </form>
      </Card>
    </>
  );
}
