export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export type ConfigResult = { ok: true; config: SupabaseConfig } | { ok: false; problems: string[] };

/**
 * Validates the public Supabase settings. Only the project URL and publishable (anon) key
 * belong in the browser; a service-role/secret key here is rejected outright.
 */
export function readSupabaseConfig(env: Record<string, string | undefined>): ConfigResult {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const problems: string[] = [];

  if (!url) problems.push('VITE_SUPABASE_URL is not set.');
  else if (!/^https?:\/\/[^\s/]+/.test(url)) problems.push('VITE_SUPABASE_URL must be a full URL, e.g. https://xyz.supabase.co.');

  if (!publishableKey) problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is not set.');
  else if (publishableKey.startsWith('sb_secret_') || looksLikeServiceRoleJwt(publishableKey)) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY contains a secret/service-role key. Use the publishable key instead and rotate the exposed secret.');
  }

  return problems.length ? { ok: false, problems } : { ok: true, config: { url, publishableKey } };
}

function looksLikeServiceRoleJwt(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}
