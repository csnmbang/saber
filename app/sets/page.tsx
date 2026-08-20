import { cookies } from 'next/headers';
import Link from 'next/link';
import { dbConfigured, sql } from '@/lib/db';
import { decodeGrants, SESSION_COOKIE } from '@/lib/session';
import { archetypeById, type ArchetypeId } from '@/lib/metrics/archetype';

type Row = {
  id: string;
  claim_token: string;
  archetype: string;
  source: string;
  is_public: boolean;
  created_at: string;
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
      select id, claim_token, archetype, source, is_public, created_at
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
            className="label mt-6 inline-block border border-line px-4 py-2 hover:border-text hover:text-text"
          >
            Drop a track list
          </Link>
        </section>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id} className="border-t border-line py-4">
              <Link href={`/set/${row.id}`} className="flex items-baseline justify-between gap-4">
                <span className="display text-2xl">
                  {archetypeById(row.archetype as ArchetypeId)?.name ?? row.archetype}
                </span>
                <span className="label">
                  {new Date(row.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {row.is_public ? ' · published' : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
