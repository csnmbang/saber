import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { addGrant, decodeGrants, encodeGrants, SESSION_COOKIE } from '@/lib/session';
import { computeVitals } from '@/lib/metrics/vitals';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { cleanIncomingTracks } from '@/lib/parse/sanitize';
import type { ParseSource } from '@/lib/parse/types';

const SOURCES: ParseSource[] = ['rekordbox', 'serato', 'traktor'];

type Incoming = { source?: unknown; title?: unknown; tracks?: unknown };

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

  const tracks = cleanIncomingTracks(body.tracks);
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
