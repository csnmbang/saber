import { neon } from '@neondatabase/serverless';

/**
 * Vercel's Neon integration names the connection string after whatever prefix
 * was chosen when the database was connected, so accept the handful of names it
 * actually produces rather than making the deployment match one of them.
 */
const URL_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_POSTGRES_URL',
  'STORAGE_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
] as const;

export function databaseUrl(): string | null {
  for (const name of URL_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
}

/**
 * The database connection. It is a plain Postgres connection with full rights,
 * so every route that uses it does its own authorization first — see the note
 * at the bottom of db/0001_init.sql for why that is the model here rather than
 * row level security.
 */
export function sql() {
  const url = databaseUrl();
  if (!url) throw new Error(`No database URL. Set one of: ${URL_VARS.join(', ')}.`);
  return neon(url);
}

/** Saving is only offered when there is somewhere to save to. */
export function dbConfigured(): boolean {
  return databaseUrl() !== null;
}
