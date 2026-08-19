import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { addGrant, decodeGrants, encodeGrants, SESSION_COOKIE } from '@/lib/session';
import { computeVitals } from '@/lib/metrics/vitals';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { toCamelot } from '@/lib/parse/key';
import type { ParsedTrack, ParseSource } from '@/lib/parse/types';

const SOURCES: ParseSource[] = ['rekordbox', 'serato', 'traktor'];
const MAX_TRACKS = 600;

type Incoming = { source?: unknown; title?: unknown; tracks?: unknown };

/**
 * Re-read the tracklist rather than trusting whatever the client says it found.
 * The readings are recomputed here from the tracks themselves, so a saved set
 * always agrees with the code that produced it.
 */
function cleanTracks(raw: unknown): ParsedTrack[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TRACKS) return null;

  const tracks: ParsedTrack[] = [];
  for (const item of raw) {
    if (typeof item?.title !== 'string' || !item.title.trim()) return null;
    const bpm = typeof item.bpm === 'number' && Number.isFinite(item.bpm) ? item.bpm : null;
    const durationS =
      typeof item.durationS === 'number' && Number.isFinite(item.durationS)
        ? Math.max(0, Math.trunc(item.durationS))
        : null;
    tracks.push({
      position: tracks.length + 1,
      title: item.title.slice(0, 300),
      artist: typeof item.artist === 'string' ? item.artist.slice(0, 300) : null,
      bpm: bpm !== null && bpm >= 20 && bpm <= 300 ? bpm : null,
      camelot: typeof item.camelot === 'string' ? toCamelot(item.camelot) : null,
      durationS,
      // Saving doesn't store genre — nothing downstream of a save reads it.
      // It only ever feeds the anonymous read-time KPI event, client-side.
      genre: null,
    });
  }
  return tracks;
}

export async function POST(request: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ error: 'Saving is not set up on this deployment.' }, { status: 503 });
  }

  let body: Incoming;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body.' }, { status: 400 });
  }

  const tracks = cleanTracks(body.tracks);
  if (!tracks) {
    return NextResponse.json({ error: 'That tracklist could not be read.' }, { status: 400 });
  }

  const source = SOURCES.includes(body.source as ParseSource)
    ? (body.source as ParseSource)
    : 'rekordbox';
  const title =
    typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : null;

  const vitals = computeVitals(tracks);
  const archetype = resolveArchetype(vitals);
  const db = sql();

  try {
    // is_public is never set here. Publishing is its own, later, explicit act.
    const [created] = (await db`
      insert into sets (source, title, archetype, vitals)
      values (${source}, ${title}, ${archetype.id}, ${JSON.stringify(vitals)}::jsonb)
      returning id, claim_token
    `) as { id: string; claim_token: string }[];

    await db`
      insert into tracks (set_id, position, title, artist, bpm, camelot, duration_s)
      select ${created.id}::uuid, * from unnest(
        ${tracks.map((t) => t.position)}::int[],
        ${tracks.map((t) => t.title)}::text[],
        ${tracks.map((t) => t.artist)}::text[],
        ${tracks.map((t) => t.bpm)}::numeric[],
        ${tracks.map((t) => t.camelot)}::text[],
        ${tracks.map((t) => t.durationS)}::int[]
      )
    `;

    const jar = await cookies();
    const grants = addGrant(decodeGrants(jar.get(SESSION_COOKIE)?.value), {
      setId: created.id,
      claimToken: created.claim_token,
    });
    jar.set(SESSION_COOKIE, encodeGrants(grants), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ id: created.id });
  } catch {
    return NextResponse.json({ error: 'Could not save that set.' }, { status: 500 });
  }
}
