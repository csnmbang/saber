import { describe, expect, it } from 'vitest';
import { computeVitals } from '@/lib/metrics/vitals';
import type { ParsedTrack } from '@/lib/parse/types';

function track(genre: string | null, durationS: number | null): ParsedTrack {
  return { position: 1, title: 't', artist: 'a', bpm: 124, camelot: '8A', durationS, genre };
}

describe('genreShare', () => {
  it('weights by time played, not track count', () => {
    // One long house track against two short techno ones: by count techno
    // leads 2:1, by time house leads.
    const { genreShare } = computeVitals([
      track('House', 600),
      track('Techno', 120),
      track('Techno', 120),
    ]).components;
    expect(genreShare['House']).toBeCloseTo(600 / 840);
    expect(genreShare['Techno']).toBeCloseTo(240 / 840);
  });

  it('falls back to one unit per track when the export has no durations', () => {
    const { genreShare } = computeVitals([
      track('House', null),
      track('Techno', null),
      track('Techno', null),
    ]).components;
    expect(genreShare['Techno']).toBeCloseTo(2 / 3);
    expect(genreShare['House']).toBeCloseTo(1 / 3);
  });

  it('is empty rather than guessed when the export carried no genres', () => {
    const { genreShare } = computeVitals([track(null, 300), track(null, 300)]).components;
    expect(genreShare).toEqual({});
  });

  it('ignores blank genre cells without counting them against the total', () => {
    const { genreShare } = computeVitals([
      track('House', 300),
      track('   ', 300),
      track(null, 300),
    ]).components;
    expect(genreShare).toEqual({ House: 1 });
  });

  it('keeps the export spelling exactly, slashes and all', () => {
    const { genreShare } = computeVitals([track('Minimal / Deep Tech', 300)]).components;
    expect(Object.keys(genreShare)).toEqual(['Minimal / Deep Tech']);
  });

  it('shares sum to 1 across genres', () => {
    const { genreShare } = computeVitals([
      track('A', 100),
      track('B', 250),
      track('C', 650),
    ]).components;
    const total = Object.values(genreShare).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1);
  });
});
