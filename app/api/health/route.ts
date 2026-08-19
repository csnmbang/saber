import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Whether this deployment can save, and nothing else. Booleans only — never a
 * value, a host, or a fragment of one. The point is to tell "the variable is
 * missing" apart from "the variable is wrong" without putting either on the
 * public internet.
 */
export async function GET() {
  const secret = process.env.SESSION_SECRET;
  return NextResponse.json({
    database: dbConfigured(),
    sessionSecret: Boolean(secret) && (secret?.length ?? 0) >= 32,
    canSave: dbConfigured() && (secret?.length ?? 0) >= 32,
  });
}
