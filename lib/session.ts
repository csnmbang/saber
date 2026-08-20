import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * An anonymous uploader's proof that a set is theirs.
 *
 * A set is created before anyone signs in, so ownership has to live somewhere
 * until an account claims it. That somewhere is a signed cookie: the server
 * mints a token naming the set and its claim secret, and will only serve an
 * unclaimed set to a request that presents one. Signing means the cookie can be
 * read by its holder but not forged by them.
 */
export const SESSION_COOKIE = 'saber_sets';

export type SetGrant = { setId: string; claimToken: string };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    // Failing loudly beats minting tokens anyone could forge.
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  }
  return value;
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

/** Serialize the grants a browser holds into one signed cookie value. */
export function encodeGrants(grants: SetGrant[]): string {
  const body = Buffer.from(JSON.stringify(grants)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Read a cookie value back. Returns [] for anything unsigned or tampered with. */
export function decodeGrants(cookie: string | undefined | null): SetGrant[] {
  if (!cookie) return [];
  const dot = cookie.lastIndexOf('.');
  if (dot <= 0) return [];

  const body = cookie.slice(0, dot);
  const provided = Buffer.from(cookie.slice(dot + 1));
  const expected = Buffer.from(sign(body));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return [];

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (grant): grant is SetGrant =>
        typeof grant?.setId === 'string' && typeof grant?.claimToken === 'string',
    );
  } catch {
    return [];
  }
}

/** Most recent first, and capped so the cookie cannot grow without bound. */
export function addGrant(existing: SetGrant[], grant: SetGrant, limit = 40): SetGrant[] {
  return [grant, ...existing.filter((g) => g.setId !== grant.setId)].slice(0, limit);
}

export function holdsGrant(grants: SetGrant[], setId: string, claimToken: string): boolean {
  return grants.some((g) => g.setId === setId && g.claimToken === claimToken);
}

/**
 * A random id kept in a signed cookie, identifying a browser and nothing else.
 *
 * It exists to answer one question — how many different people have dropped a
 * set — and is deliberately incapable of answering any other. It carries no
 * account, no email, no address: a fresh random value on first use, and the
 * signature only stops someone hand-editing one browser's id into another's.
 *
 * Worth being precise about what it counts: distinct browsers, not distinct
 * people. The same person on a phone and a laptop is two, a cleared cookie
 * starts over, and a shared machine is one. It is a floor on real usage, not
 * a headcount.
 */
export const READER_COOKIE = 'saber_reader';

export function encodeReaderId(id: string): string {
  return `${id}.${sign(id)}`;
}

export function decodeReaderId(cookie: string | undefined | null): string | null {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf('.');
  if (dot <= 0) return null;

  const id = cookie.slice(0, dot);
  const provided = Buffer.from(cookie.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
