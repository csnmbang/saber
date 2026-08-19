import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import { computeVitals } from '@/lib/metrics/vitals';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { decodeShare, encodeShare } from '@/lib/share';

const parsed = parseRekordboxTxt(
  readFileSync(path.join(__dirname, 'fixtures/rekordbox/euro-problem.txt')),
);
const vitals = computeVitals(parsed.tracks);

describe('share links', () => {
  it('round-trips the readings', () => {
    const decoded = decodeShare(encodeShare(vitals));
    expect(decoded).not.toBeNull();
    expect(decoded!.harmonic).toBeCloseTo(vitals.harmonic!, 5);
    expect(decoded!.risk).toBeCloseTo(vitals.risk!, 5);
    expect(decoded!.climb).toBeCloseTo(vitals.climb!, 2);
    expect(decoded!.trackCount).toBe(vitals.trackCount);
    expect(decoded!.components.transitions).toEqual(vitals.components.transitions);
    expect(decoded!.components.shape).toBe(vitals.components.shape);
  });

  it('resolves to the same archetype on the other end', () => {
    const decoded = decodeShare(encodeShare(vitals))!;
    expect(resolveArchetype(decoded).id).toBe(resolveArchetype(vitals).id);
  });

  it('keeps the ring weights within a rounding step', () => {
    const decoded = decodeShare(encodeShare(vitals))!;
    for (let n = 1; n <= 12; n++) {
      expect(decoded.components.keyTimeShare[n]).toBeCloseTo(
        vitals.components.keyTimeShare[n],
        2,
      );
    }
  });

  it('carries no track titles or artists', () => {
    const code = encodeShare(vitals);
    const json = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    for (const track of parsed.tracks) {
      expect(json).not.toContain(track.title);
      if (track.artist) expect(json).not.toContain(track.artist);
    }
  });

  it('stays short enough to paste anywhere', () => {
    expect(encodeShare(vitals).length).toBeLessThan(400);
  });

  it('refuses anything malformed', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('not-base64!!')).toBeNull();
    expect(decodeShare(Buffer.from('{"v":9}').toString('base64url'))).toBeNull();
    expect(decodeShare(Buffer.from('{"v":1,"t":[1,1,1,1],"n":[0,0],"k":{}}').toString('base64url'))).toBeNull();
  });

  it('survives a set with no tempo and no keys', () => {
    const bare = computeVitals([
      { position: 1, title: 'a', artist: null, bpm: null, camelot: null, durationS: null },
      { position: 2, title: 'b', artist: null, bpm: null, camelot: null, durationS: null },
    ]);
    const decoded = decodeShare(encodeShare(bare))!;
    expect(decoded.harmonic).toBeNull();
    expect(decoded.components.bpm).toBeNull();
    expect(decoded.trackCount).toBe(2);
  });
});
