import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { decodeReaderId, encodeReaderId, READER_COOKIE } from '@/lib/session';

const YEAR = 60 * 60 * 24 * 365;
const MAX_PATH = 200;

/**
 * Records that a browser landed on a page. The counterpart to /api/read: that
 * only fires on a successful drop, which misses every visitor who looked
 * around without uploading anything. Fire and forget, and a failure here must
 * never affect the page someone is looking at.
 *
 * Shares the same reader cookie as /api/read, so a visit and a later drop from
 * the same browser carry the same id without any extra work — one browser's
 * path through the site is just every row with its reader_id, in order.
 */
export async function POST(request: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false }, { status: 204 });

  let body: { path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path =
    typeof body.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, MAX_PATH) : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });

  const jar = await cookies();
  const existing = decodeReaderId(jar.get(READER_COOKIE)?.value);
  const readerId = existing ?? randomUUID();

  try {
    await sql()`insert into page_views (reader_id, path) values (${readerId}::uuid, ${path})`;
  } catch {
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
