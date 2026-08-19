import { neon } from '@neondatabase/serverless';

/**
 * The database connection. It is a plain Postgres connection with full rights,
 * so every route that uses it does its own authorization first — see the note
 * at the bottom of db/0001_init.sql for why that is the model here rather than
 * row level security.
 */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  return neon(url);
}

/** Saving is only offered when there is somewhere to save to. */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
