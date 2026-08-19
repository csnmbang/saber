/** A single track as it comes out of a DJ software export. */
export type ParsedTrack = {
  /** 1-based position in the set, as played. */
  position: number;
  title: string;
  artist: string | null;
  bpm: number | null;
  /** Normalized Camelot, e.g. '8A'. Null when the export had no usable key. */
  camelot: string | null;
  durationS: number | null;
  /** Whatever rekordbox has in its Genre column — a tag, not a taxonomy. */
  genre: string | null;
};

export type ParseSource = 'rekordbox' | 'serato' | 'traktor';

export type ParseResult = {
  source: ParseSource;
  tracks: ParsedTrack[];
  /** Share of tracks (0-1) that carry a key we could normalize. */
  keyCoverage: number;
  /**
   * False when key data is too sparse to analyze harmonically. The UI shows the
   * BPM-and-structure half of the analysis and says so plainly — it never
   * interpolates the missing keys.
   */
  hasEnoughKeys: boolean;
  /** Which export column each field came from, for debugging bad exports. */
  columns: Partial<Record<TrackField, string>>;
  warnings: string[];
};

export type TrackField = 'position' | 'title' | 'artist' | 'bpm' | 'key' | 'time' | 'genre';

/** Below this share of keyed tracks we do not report harmonic readings at all. */
export const MIN_KEY_COVERAGE = 0.6;
