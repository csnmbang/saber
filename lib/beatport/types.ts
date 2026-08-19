/**
 * One (track, artist) row from a Beatport Top 100 chart. Mirrors the shape
 * scene-radar's scraper already produces (scene_radar/beatport.py) — a track
 * with two artists yields two entries at the same rank, so multi-artist
 * tracks match on either name.
 *
 * Saber has no live connection to this data yet. This type exists so the
 * matching engine below can be built and tested now, and wired to a real feed
 * later without changing its shape.
 */
export type BeatportChartEntry = {
  chartGenre: string;
  /** 1-100. Lower is more popular. */
  rank: number;
  trackId: number;
  /** Base title only — the mix name is separate, matching how Beatport itself splits them. */
  trackTitle: string;
  mixName: string | null;
  artist: string;
};
