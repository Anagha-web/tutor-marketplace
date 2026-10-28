import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Isolated, in-memory Postgres (PGlite) that emulates the parts of Supabase the migrations
 * rely on: the anon/authenticated roles, Supabase's default grants, auth.users and auth.uid().
 * The real migration files are applied unchanged, so RLS policies and triggers are exercised
 * exactly as written. Nothing here touches a hosted Supabase project.
 */
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const root = join(process.cwd(), 'supabase');

export type Row = Record<string, unknown>;

export class TestDb {
  private constructor(readonly pg: PGlite) {}

  static async create(): Promise<TestDb> {
    const pg = new PGlite();
    await pg.exec(SUPABASE_STUBS);
    const dir = join(root, 'migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await pg.exec(readFileSync(join(dir, file), 'utf8'));
    }
    await pg.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
    return new TestDb(pg);
  }

  /** Simulates Supabase Auth signup: inserts into auth.users, firing the signup trigger. */
  async signUp(email: string, meta: Record<string, string> = {}): Promise<string> {
    const res = await this.pg.query<{ id: string }>(
      'insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id',
      [email, JSON.stringify(meta)],
    );
    return res.rows[0].id;
  }

  /** Runs SQL as a trusted role (like the Supabase SQL editor). */
  async trusted<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.pg.query<T>(sql, params)).rows;
  }

  /** Runs SQL as an API request: `null` = anon, otherwise an authenticated user id. */
  async as<T extends Row = Row>(userId: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
    await this.pg.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
    await this.pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
    try {
      return (await this.pg.query<T>(sql, params)).rows;
    } finally {
      await this.pg.exec('reset role');
      await this.pg.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  }

  async subjectId(slug: string): Promise<string> {
    const rows = await this.trusted<{ id: string }>('select id from public.subjects where slug = $1', [slug]);
    return rows[0].id;
  }

  async tutorProfileId(userId: string): Promise<string> {
    const rows = await this.trusted<{ id: string }>('select id from public.tutor_profiles where user_id = $1', [userId]);
    return rows[0].id;
  }

  async close() {
    await this.pg.close();
  }
}
