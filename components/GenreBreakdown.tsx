import type { Vitals } from '@/lib/metrics/vitals';

const TOP_N = 4;

/**
 * Genres as the DJ's own library spells them, weighted by time played.
 *
 * Renders nothing at all when the export carried no genre column — plenty of
 * rekordbox libraries are untagged, and an empty "Genres" heading would read
 * as a fault in the set rather than a gap in the export.
 */
export function GenreBreakdown({ vitals }: { vitals: Vitals }) {
  const entries = Object.entries(vitals.components.genreShare)
    .filter(([, share]) => share > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const top = entries.slice(0, TOP_N);
  const restShare = entries.slice(TOP_N).reduce((sum, [, share]) => sum + share, 0);
  const rows: [string, number][] = restShare > 0 ? [...top, ['other', restShare]] : top;

  return (
    <section className="mt-8">
      <p className="label">Genres</p>
      <dl className="mt-2">
        {rows.map(([genre, share]) => (
          <div key={genre} className="flex items-baseline justify-between gap-6 max-w-xs py-0.5">
            <dt className="text-[13px] truncate">{genre}</dt>
            <dd className="readout text-[13px] text-muted shrink-0">{Math.round(share * 100)}%</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
