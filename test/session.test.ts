import { beforeAll, describe, expect, it } from 'vitest';
import {
  addGrant,
  decodeGrants,
  encodeGrants,
  holdsGrant,
  type SetGrant,
} from '@/lib/session';

const grant: SetGrant = {
  setId: '11111111-1111-1111-1111-111111111111',
  claimToken: '22222222-2222-2222-2222-222222222222',
};

beforeAll(() => {
  process.env.SESSION_SECRET = 'a'.repeat(40);
});

describe('anonymous set grants', () => {
  it('round-trips through a cookie', () => {
    expect(decodeGrants(encodeGrants([grant]))).toEqual([grant]);
  });

  it('rejects a tampered payload', () => {
    const cookie = encodeGrants([grant]);
    const [body, signature] = cookie.split('.');
    const forged = Buffer.from(
      JSON.stringify([{ setId: 'someone-elses-set', claimToken: 'guess' }]),
    ).toString('base64url');
    expect(decodeGrants(`${forged}.${signature}`)).toEqual([]);
    expect(decodeGrants(`${body}.not-the-signature`)).toEqual([]);
  });

  it('rejects junk instead of throwing', () => {
    expect(decodeGrants(undefined)).toEqual([]);
    expect(decodeGrants('')).toEqual([]);
    expect(decodeGrants('no-dot')).toEqual([]);
    expect(decodeGrants('.sig')).toEqual([]);
  });

  it('refuses to sign without a real secret', () => {
    const saved = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'too-short';
    expect(() => encodeGrants([grant])).toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = saved;
  });

  it('keeps the newest grant and drops duplicates', () => {
    const second = { setId: 'b', claimToken: 'y' };
    const grants = addGrant(addGrant([], grant), second);
    expect(grants[0]).toEqual(second);
    expect(addGrant(grants, { setId: 'b', claimToken: 'z' })).toHaveLength(2);
  });

  it('caps how many sets one cookie can carry', () => {
    let grants: SetGrant[] = [];
    for (let i = 0; i < 60; i++) grants = addGrant(grants, { setId: `s${i}`, claimToken: 't' });
    expect(grants).toHaveLength(40);
  });

  it('only recognizes a set the holder actually has the token for', () => {
    const grants = [grant];
    expect(holdsGrant(grants, grant.setId, grant.claimToken)).toBe(true);
    expect(holdsGrant(grants, grant.setId, 'wrong-token')).toBe(false);
    expect(holdsGrant(grants, 'other-set', grant.claimToken)).toBe(false);
  });
});
