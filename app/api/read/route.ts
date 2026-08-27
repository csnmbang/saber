import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { decodeReaderId, encodeReaderId, READER_COOKIE } from '@/lib/session';

const SOURCES = new Set(['rekordbox', 'serato', 'traktor']);
const YEAR = 60 * 60 * 24 * 365;

/**
 * Records that a set was read: a browser id, a timestamp, the coarse shape of
 * the drop, and now the full reading — archetype and vitals — so "what did
 * people get" has an answer, not just "how many people used this". Fire and
 * forget from the client, and a failure here must never cost someone their
 * reading.
 *
 * vitals is the same jsonb sets.vitals already stores on an explicit save.
 * Still no track titles, no artists, no address — genre share is a share of a
 * genre string the export carried, not a track.
 */
export async function POST(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false }, { status: 204 });

  let body: {
    source?: unknown;
    trackCount?: unknown;
    hasEnoughKeys?: unknown;
    archetype?: unknown;
    vitals?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const source = SOURCES.has(body.source as string) ? (body.source as string) : 'rekordbox';
  const trackCount =
    typeof body.trackCount === 'number' && Number.isFinite(body.trackCount)
      ? Math.min(5000, Math.max(0, Math.trunc(body.trackCount)))
      : 0;
  const hasKeys = body.hasEnoughKeys === true;
  const archetype = typeof body.archetype === 'string' ? body.archetype.slice(0, 40) : null;
  // Trust the shape, not the numbers: anything readable as an object goes in
  // as-is. A malformed or missing vitals payload just leaves the column null
  // rather than failing the request — this is a counter, not a save.
  const vitals =
    body.vitals && typeof body.vitals === 'object' ? JSON.stringify(body.vitals) : null;

  const jar = await cookies();
  const existing = decodeReaderId(jar.get(READER_COOKIE)?.value);
  const readerId = existing ?? randomUUID();

  try {
    await sql()`
      insert into set_reads (reader_id, source, track_count, has_keys, archetype, vitals)
      values (${readerId}::uuid, ${source}, ${trackCount}, ${hasKeys}, ${archetype}, ${vitals}::jsonb)
    `;
  } catch {
    // Counting is not worth failing a request over.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  if (!existing) {
    jar.set(READER_COOKIE, encodeReaderId(readerId), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: YEAR,
    });
  }

  return NextResponse.json({ ok: true });
}
