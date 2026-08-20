import { cookies } from 'next/headers';
import Link from 'next/link';
import { dbConfigured, sql } from '@/lib/db';
import { decodeGrants, SESSION_COOKIE } from '@/lib/session';
import { SetCard } from '@/components/SetCard';
import type { Vitals } from '@/lib/metrics/vitals';

type Row = {
  id: string;
  claim_token: string;
  archetype: string;
  source: string;
  is_public: boolean;
  created_at: string;
  vitals: Vitals;
};

/**
 * A profile without an account: the sets this browser has saved, from the
 * signed cookie that holds them. No login, because none is
 * needed: the browser already proves which sets are yours. The cost is that
 * this list is per-device, which is exactly what accounts would later fix.
 */
export default async function YourSets() {
  const jar = await cookies();
  const grants = decodeGrants(jar.get(SESSION_COOKIE)?.value);

  let rows: Row[] = [];
  if (dbConfigured() && grants.length > 0) {
    const db = sql();
    rows = (await db`
      select id, claim_token, archetype, source, is_public, created_at, vitals
      from sets where id = any(${grants.map((g) => g.setId)}::uuid[])
      order by created_at desc
    `) as Row[];
    // Belt and braces: the cookie is signed, but only show rows whose token
    // actually matches the one it carries.
    const tokens = new Map(grants.map((g) => [g.setId, g.claimToken]));
    rows = rows.filter((row) => tokens.get(row.id) === row.claim_token);
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        <Link href="/" className="display text-6xl inline-block">
          Saber
        </Link>
        <p className="text-muted mt-2">
          {rows.length === 0
            ? 'My profile'
            : `My profile · ${rows.length} ${rows.length === 1 ? 'set' : 'sets'}`}
        </p>
      </header>

      {rows.length === 0 ? (
        <section>
          <p>Nothing saved yet.</p>
          <Link
            href="/"
            className="btn mt-6"
          >
            Drop a track list
          </Link>
        </section>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <SetCard
              key={row.id}
              id={row.id}
              vitals={row.vitals}
              archetype={row.archetype}
              createdAt={row.created_at}
              isPublic={row.is_public}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
