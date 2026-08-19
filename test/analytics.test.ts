import { describe, expect, it } from 'vitest';
import { dominantGenre } from '@/lib/analytics';
import type { ParsedTrack } from '@/lib/parse/types';

function track(genre: string | null): ParsedTrack {
  return { position: 1, title: 't', artist: null, bpm: null, camelot: null, durationS: null, genre };
}

describe('dominantGenre', () => {
  it('picks the most common genre', () => {
    const tracks = [track('Techno'), track('Techno'), track('House')];
    expect(dominantGenre(tracks)).toBe('Techno');
  });

  it('ignores tracks with no genre entirely', () => {
    const tracks = [track(null), track(null), track('House')];
    expect(dominantGenre(tracks)).toBe('House');
  });

  it('returns null when nothing has a genre', () => {
    expect(dominantGenre([track(null), track(null)])).toBeNull();
    expect(dominantGenre([])).toBeNull();
  });

  it('is exact-string, not normalized — "Tech House" and "tech-house" count separately', () => {
    const tracks = [track('Tech House'), track('Tech House'), track('tech-house')];
    expect(dominantGenre(tracks)).toBe('Tech House');
  });
});
