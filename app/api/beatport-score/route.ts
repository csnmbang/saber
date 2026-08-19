import { NextResponse } from 'next/server';
import { cleanIncomingTracks } from '@/lib/parse/sanitize';
import { scoreAgainstBeatport } from '@/lib/beatport/match';
import { latestBeatportChart } from '@/lib/beatport/store';

type Incoming = { tracks?: unknown };

/**
 * Score a tracklist against whatever Beatport Top 100 snapshot scene-radar's
 * cron most recently wrote. Recomputed here from the submitted tracks, same
 * trust boundary as /api/sets — never a client-claimed score.
 *
 * Always 200. A chart-less deployment isn't an error state, it's the normal
 * state before the first cron run — scoreAgainstBeatport already reports that
 * as pct: null rather than a fabricated zero, and the client reads that null
 * to know there's nothing to show yet.
 */
export async function POST(request: Request) {
  let body: Incoming;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body.' }, { status: 400 });
  }

  const tracks = cleanIncomingTracks(body.tracks);
  if (!tracks) {
    return NextResponse.json({ error: 'That tracklist could not be read.' }, { status: 400 });
  }

  const chart = await latestBeatportChart();
  return NextResponse.json(scoreAgainstBeatport(tracks, chart));
}
