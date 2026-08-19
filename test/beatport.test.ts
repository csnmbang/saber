import { describe, expect, it } from 'vitest';
import { normalize, splitArtists, splitMixName } from '@/lib/beatport/normalize';
import { levenshtein, similarity } from '@/lib/beatport/similarity';
import { matchTrack, scoreAgainstBeatport } from '@/lib/beatport/match';
import type { BeatportChartEntry } from '@/lib/beatport/types';
import type { ParsedTrack } from '@/lib/parse/types';

function track(title: string, artist: string | null): ParsedTrack {
  return { position: 1, title, artist, bpm: 124, camelot: '8A', durationS: 300, genre: null };
}

function entry(overrides: Partial<BeatportChartEntry>): BeatportChartEntry {
  return {
    chartGenre: 'tech-house',
    rank: 1,
    trackId: 1,
    trackTitle: 'Track Name',
    mixName: 'Original Mix',
    artist: 'Some Artist',
    ...overrides,
  };
}

describe('splitMixName', () => {
  it('pulls a trailing mix suffix off a rekordbox-style title', () => {
    expect(splitMixName('Vivenza (Original Mix)')).toEqual({ title: 'Vivenza', mix: 'Original Mix' });
    expect(splitMixName('Cliche (Soulwax Remix)')).toEqual({ title: 'Cliche', mix: 'Soulwax Remix' });
  });

  it('leaves a title with no mix suffix alone', () => {
    expect(splitMixName('Vivenza')).toEqual({ title: 'Vivenza', mix: null });
  });

  it('does not treat every parenthetical as a mix name', () => {
    // "(feat. X)" has none of the mix/edit/remix/version/dub/vip/bootleg words.
    expect(splitMixName('Song (feat. X)')).toEqual({ title: 'Song (feat. X)', mix: null });
  });
});

describe('normalize', () => {
  it('lowercases, strips accents and punctuation, collapses whitespace', () => {
    expect(normalize('Café  Del Mar!!')).toBe('cafe del mar');
    expect(normalize('Above & Beyond')).toBe('above and beyond');
  });
});

describe('splitArtists', () => {
  it('splits a collab cell into individual names', () => {
    expect(splitArtists('Martin Occo, Dissolut')).toEqual(['Martin Occo', 'Dissolut']);
    expect(splitArtists('A feat. B')).toEqual(['A', 'B']);
    expect(splitArtists('A x B')).toEqual(['A', 'B']);
  });

  it('leaves a single artist as one entry', () => {
    expect(splitArtists('Josu Freire')).toEqual(['Josu Freire']);
  });
});

describe('levenshtein / similarity', () => {
  it('matches the textbook distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });

  it('scores identical strings at 100 and empty pairs at 100', () => {
    expect(similarity('abc', 'abc')).toBe(100);
    expect(similarity('', '')).toBe(100);
  });
});

describe('matchTrack', () => {
  const chart = [
    entry({ trackTitle: 'Vivenza', mixName: 'Original Mix', artist: 'Josu Freire' }),
    entry({ trackTitle: 'Fernet', mixName: 'Original Mix', artist: 'Del Fonda', rank: 40 }),
  ];

  it('matches on title and artist even with the mix name folded into the title', () => {
    const match = matchTrack(track('Vivenza (Original Mix)', 'Josu Freire'), chart);
    expect(match?.entry.trackTitle).toBe('Vivenza');
    expect(match?.confidence).toBeGreaterThanOrEqual(90);
  });

  it('matches through small spelling differences', () => {
    const match = matchTrack(track('Vivenza (Extended Mix)', 'Josu Freir'), chart);
    expect(match?.entry.trackTitle).toBe('Vivenza');
  });

  it('matches on any one artist in a multi-artist credit', () => {
    const match = matchTrack(track('Fernet (Original Mix)', 'Someone Else, Del Fonda'), chart);
    expect(match?.entry.artist).toBe('Del Fonda');
  });

  it('refuses a right title with the wrong artist', () => {
    expect(matchTrack(track('Vivenza (Original Mix)', 'A Totally Different DJ'), chart)).toBeNull();
  });

  it('refuses a right artist with the wrong title', () => {
    expect(matchTrack(track('A Totally Different Song', 'Josu Freire'), chart)).toBeNull();
  });

  it('does not let a near-miss name pass — same shape, different person', () => {
    // The exact case scene-radar's own guard exists for: same word count,
    // one surname swapped, high enough overall ratio to tempt a naive match.
    const closeChart = [entry({ trackTitle: 'Anything', artist: 'Chris Lake' })];
    expect(matchTrack(track('Anything', 'Chris Clarke'), closeChart)).toBeNull();
  });

  it('returns null rather than guessing when the track has no artist', () => {
    expect(matchTrack(track('Vivenza', null), chart)).toBeNull();
  });
});

describe('scoreAgainstBeatport', () => {
  const chart = [
    entry({ trackTitle: 'Vivenza', artist: 'Josu Freire' }),
    entry({ trackTitle: 'Fernet', artist: 'Del Fonda', rank: 12 }),
  ];

  it('reports the real share of the set that matched', () => {
    const tracks = [
      track('Vivenza (Original Mix)', 'Josu Freire'),
      track('Fernet (Original Mix)', 'Del Fonda'),
      track('Something Unrelated', 'Nobody Charting'),
    ];
    const score = scoreAgainstBeatport(tracks, chart);
    expect(score.matchedCount).toBe(2);
    expect(score.pct).toBeCloseTo(2 / 3);
  });

  it('reports a real, honest zero when the chart has data but nothing matched', () => {
    const score = scoreAgainstBeatport([track('Nothing Charting', 'Nobody')], chart);
    expect(score.pct).toBe(0);
  });

  it('reports null rather than a fabricated zero when there is no chart to check against', () => {
    const score = scoreAgainstBeatport([track('Vivenza', 'Josu Freire')], []);
    expect(score.pct).toBeNull();
  });
});
