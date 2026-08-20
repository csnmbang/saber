import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { decodeReaderId, encodeReaderId, READER_COOKIE } from '@/lib/session';

const SOURCES = new Set(['rekordbox', 'serato', 'traktor']);
const YEAR = 60 * 60 * 24 * 365;

/**
 * Records that a set was read, so "how many different people have used this"
 * has an answer. Fire and forget from the client — nothing on the page waits
 * on it, and a failure here must never cost someone their reading.
 *
 * What it stores is the whole point: a browser id, a timestamp, and the coarse
 * shape of the drop. No titles, no artists, no tempo, no address.
 */
export async function POST(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false }, { status: 204 });

  let body: { source?: unknown; trackCount?: unknown; hasEnoughKeys?: unknown };
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

  const jar = await cookies();
  const existing = decodeReaderId(jar.get(READER_COOKIE)?.value);
  const readerId = existing ?? randomUUID();

  try {
    await sql()`
      insert into set_reads (reader_id, source, track_count, has_keys)
      values (${readerId}::uuid, ${source}, ${trackCount}, ${hasKeys})
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
