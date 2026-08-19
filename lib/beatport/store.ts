import { dbConfigured, sql } from '../db';
import type { BeatportChartEntry } from './types';

type Row = {
  chart_genre: string;
  rank: number;
  track_id: string | number;
  track_title: string;
  mix_name: string | null;
  artist_raw: string;
};

/**
 * Every entry from the most recent snapshot scene-radar's cron has written.
 * A database with no snapshot yet returns [] — a real, current state (nothing
 * has run yet, or saving isn't configured on this deployment) rather than an
 * error, and scoreAgainstBeatport already turns an empty chart into a null
 * pct instead of a fabricated zero.
 */
export async function latestBeatportChart(): Promise<BeatportChartEntry[]> {
  if (!dbConfigured()) return [];

  const db = sql();
  const rows = (await db`
    select chart_genre, rank, track_id, track_title, mix_name, artist_raw
    from beatport_chart_entries
    where snapshot_date = (select max(snapshot_date) from beatport_chart_entries)
  `) as Row[];

  return rows.map((r) => ({
    chartGenre: r.chart_genre,
    rank: r.rank,
    trackId: Number(r.track_id),
    trackTitle: r.track_title,
    mixName: r.mix_name,
    artist: r.artist_raw,
  }));
}
