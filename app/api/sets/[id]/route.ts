import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbConfigured, sql } from '@/lib/db';
import { decodeGrants, holdsGrant, SESSION_COOKIE } from '@/lib/session';

/**
 * Publish or unpublish. Only the cookie that saved the set can do either, and
 * unpublishing is a single write with no confirmation step — a DJ who wants a
 * set off the internet should not have to argue with a dialog about it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  let isPublic: boolean;
  try {
    const body = await request.json();
    if (typeof body?.isPublic !== 'boolean') throw new Error('bad body');
    isPublic = body.isPublic;
  } catch {
    return NextResponse.json({ error: 'Send { isPublic: true | false }.' }, { status: 400 });
  }

  const db = sql();
  const [set] = (await db`select id, claim_token from sets where id = ${id}::uuid`) as {
    id: string;
    claim_token: string;
  }[];
  if (!set) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const jar = await cookies();
  const grants = decodeGrants(jar.get(SESSION_COOKIE)?.value);
  if (!holdsGrant(grants, set.id, set.claim_token)) {
    // Same answer as a set that does not exist: whether one does is not
    // something a stranger gets to learn.
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  await db`update sets set is_public = ${isPublic} where id = ${id}::uuid`;
  return NextResponse.json({ isPublic });
}
