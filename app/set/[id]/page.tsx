import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SetSummary } from '@/components/SetSummary';
import { Tracklist } from '@/components/Tracklist';
import { decodeGrants, holdsGrant, SESSION_COOKIE } from '@/lib/session';
import { dbConfigured, sql } from '@/lib/db';
import type { Vitals } from '@/lib/metrics/vitals';
import type { ParsedTrack } from '@/lib/parse/types';

type TrackRow = {
  position: number;
  title: string;
  artist: string | null;
  bpm: string | number | null;
  camelot: string | null;
  duration_s: number | null;
};

type SetRow = {
  id: string;
  claim_token: string;
  title: string | null;
  source: string;
  is_public: boolean;
  vitals: Vitals;
  created_at: string;
};

export default async function SavedSet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = sql();
  const [set] = (await db`
    select id, claim_token, title, source, is_public, vitals, created_at
    from sets where id = ${id}::uuid
  `) as SetRow[];
  if (!set) notFound();

  // Published sets are open. Everything else needs the cookie that was minted
  // when the set was saved, so an unclaimed set is readable only by whoever
  // uploaded it.
  const jar = await cookies();
  const grants = decodeGrants(jar.get(SESSION_COOKIE)?.value);
  const isOwner = holdsGrant(grants, set.id, set.claim_token);
  if (!set.is_public && !isOwner) notFound();

  const trackRows = (await db`
    select position, title, artist, bpm, camelot, duration_s
    from tracks where set_id = ${set.id}::uuid order by position
  `) as TrackRow[];

  const tracks: ParsedTrack[] = trackRows.map((row) => ({
    position: row.position,
    title: row.title,
    artist: row.artist,
    bpm: row.bpm === null ? null : Number(row.bpm),
    camelot: row.camelot,
    durationS: row.duration_s,
  }));

  const played = new Date(set.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        <Link href="/" className="display text-6xl inline-block">
          Saber
        </Link>
        <p className="text-muted mt-2">{set.title ?? 'Saved set'}</p>
      </header>

      <SetSummary
        vitals={set.vitals}
        meta={`${tracks.length} tracks · ${set.source} · ${played}`}
      />

      {tracks.length > 0 && <Tracklist tracks={tracks} />}

      <div className="flex flex-wrap items-baseline gap-6">
        <Link
          href="/sets"
          className="label border border-line px-4 py-2 hover:border-text hover:text-text"
        >
          Your sets
        </Link>
        {isOwner && !set.is_public && (
          <p className="label">Only you can open this. It is not published.</p>
        )}
      </div>
    </main>
  );
}
