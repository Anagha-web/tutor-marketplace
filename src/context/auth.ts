import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { Profile } from '../lib/types';

export type SignupRole = 'student' | 'tutor';

export interface SignUpParams {
  fullName: string;
  email: string;
  password: string;
  role: SignupRole;
}

export interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  profileError: boolean;
  signIn(email: string, password: string): Promise<{ ok: boolean }>;
  signUp(params: SignUpParams): Promise<{ ok: boolean; needsConfirmation: boolean; message?: string }>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
