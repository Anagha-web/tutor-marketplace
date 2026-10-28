import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { AuthContext, type AuthContextValue } from './auth';

interface ProfileResult {
  userId: string;
  profile: Profile | null;
  error: boolean;
}

async function fetchProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase!.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { userId, profile: (data as Profile | null) ?? null, error: !!error || !data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!supabase);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    // Keep this callback synchronous: calling Supabase inside it can deadlock the auth client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    fetchProfile(userId).then((result) => !cancelled && setProfileResult(result));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Only trust a loaded profile if it belongs to the current session's user.
  const current = userId && profileResult?.userId === userId ? profileResult : null;

  const refreshProfile = useCallback(async () => {
    if (userId) setProfileResult(await fetchProfile(userId));
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: !!supabase,
      loading: sessionLoading || (!!userId && !current),
      session,
      profile: current?.profile ?? null,
      profileError: current?.error ?? false,
      async signIn(email, password) {
        if (!supabase) return { ok: false };
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { ok: !error };
      },
      async signUp({ fullName, email, password, role }) {
        if (!supabase) return { ok: false, needsConfirmation: false };
        // The role is only a request: the database trigger accepts 'student' or 'tutor' and
        // never 'admin'. Admins are promoted through a trusted SQL procedure.
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), role },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (error) {
          const weak = /password/i.test(error.message) ? error.message : undefined;
          return { ok: false, needsConfirmation: false, message: weak };
        }
        return { ok: true, needsConfirmation: !data.session };
      },
      async signOut() {
        await supabase?.auth.signOut();
        setProfileResult(null);
      },
      refreshProfile,
    }),
    [session, current, sessionLoading, userId, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
