import { afterEach, describe, expect, it } from 'vitest';
import { databaseUrl, dbConfigured } from '@/lib/db';

const NAMES = ['DATABASE_URL', 'POSTGRES_URL', 'DATABASE_POSTGRES_URL', 'STORAGE_URL'];

afterEach(() => {
  for (const name of NAMES) delete process.env[name];
});

describe('database url', () => {
  it('is absent until something sets it', () => {
    expect(databaseUrl()).toBeNull();
    expect(dbConfigured()).toBe(false);
  });

  it('accepts whichever name the Vercel integration wrote', () => {
    for (const name of NAMES) {
      process.env[name] = `postgres://from-${name}`;
      expect(databaseUrl()).toBe(`postgres://from-${name}`);
      expect(dbConfigured()).toBe(true);
      delete process.env[name];
    }
  });

  it('prefers DATABASE_URL when more than one is present', () => {
    process.env.POSTGRES_URL = 'postgres://second';
    process.env.DATABASE_URL = 'postgres://first';
    expect(databaseUrl()).toBe('postgres://first');
  });
});
