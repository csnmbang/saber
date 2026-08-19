import { normalize, splitArtists, splitMixName } from './normalize';
import { similarity } from './similarity';
import type { BeatportChartEntry } from './types';
import type { ParsedTrack } from '../parse/types';

/**
 * Both title and artist have to independently clear this floor. Matching on
 * an averaged score would let a dead-on artist match paper over a wrong song,
 * or the reverse — a shared title (a common one-word track name, a remix
 * everyone covers) paper over a different artist entirely. The floor itself
 * matches FUZZY_MATCH_THRESHOLD in scene-radar's own config, which this
 * engine is meant to eventually sit next to.
 */
export const MATCH_THRESHOLD = 90;

export type BeatportMatch = {
  track: ParsedTrack;
  entry: BeatportChartEntry;
  /** The lower of the title and artist scores — the match is only as good as its weakest half. */
  confidence: number;
};

/** The single best chart entry for one track, or null if nothing clears the floor. */
export function matchTrack(track: ParsedTrack, chart: BeatportChartEntry[]): BeatportMatch | null {
  const { title } = splitMixName(track.title);
  const normTitle = normalize(title);
  const artists = (track.artist ? splitArtists(track.artist) : []).map(normalize);
  if (!normTitle || artists.length === 0) return null;

  let best: BeatportMatch | null = null;

  for (const entry of chart) {
    const titleScore = similarity(normTitle, normalize(entry.trackTitle));
    if (titleScore < MATCH_THRESHOLD) continue;

    const entryArtist = normalize(entry.artist);
    const artistScore = Math.max(...artists.map((a) => similarity(a, entryArtist)));
    if (artistScore < MATCH_THRESHOLD) continue;

    const confidence = Math.min(titleScore, artistScore);
    if (!best || confidence > best.confidence) {
      best = { track, entry, confidence };
    }
  }

  return best;
}

export type BeatportScore = {
  matches: BeatportMatch[];
  matchedCount: number;
  trackCount: number;
  /**
   * Share of the set that matched, 0-1. Null when there was nothing to check
   * against — an empty or unavailable chart — never a fabricated 0. A real
   * zero (chart data present, nothing matched) is honest information and
   * stays a zero.
   */
  pct: number | null;
};

/**
 * How much of a set is charting on Beatport right now, against the genre
 * charts in `chart`. Not filtered by the track's own genre tag first — a
 * track can chart under a Beatport genre bucket that doesn't match how the
 * DJ tagged it in their own library, and filtering it out first would miss a
 * real match.
 */
export function scoreAgainstBeatport(tracks: ParsedTrack[], chart: BeatportChartEntry[]): BeatportScore {
  if (chart.length === 0) {
    return { matches: [], matchedCount: 0, trackCount: tracks.length, pct: null };
  }

  const matches = tracks
    .map((track) => matchTrack(track, chart))
    .filter((m): m is BeatportMatch => m !== null);

  return {
    matches,
    matchedCount: matches.length,
    trackCount: tracks.length,
    pct: tracks.length === 0 ? null : matches.length / tracks.length,
  };
}
