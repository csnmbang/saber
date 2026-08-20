import Link from 'next/link';
import { ringsSvgMarkup } from '@/lib/ui/ringsSvg';
import { archetypeById, type ArchetypeId } from '@/lib/metrics/archetype';
import type { Vitals } from '@/lib/metrics/vitals';

/**
 * One saved set, as a tile. The rings carry the identity — every set's is a
 * different shape, so a wall of these reads as a collection at a glance rather
 * than as a list of dates.
 *
 * Flat SVG rather than the WebGL rings: a profile draws many of these at once,
 * and a grid of spinning canvases would cost far more than it says.
 */
export function SetCard({
  id,
  vitals,
  archetype,
  createdAt,
  isPublic,
}: {
  id: string;
  vitals: Vitals;
  archetype: string;
  createdAt: string;
  isPublic: boolean;
}) {
  const name = archetypeById(archetype as ArchetypeId)?.name ?? archetype;
  const date = new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li>
      <Link
        href={`/set/${id}`}
        className="block border border-line p-5 hover:border-text transition-colors"
      >
        <div
          className="[&>svg]:w-full [&>svg]:h-auto"
          role="img"
          aria-label={`Harmonic rings for ${name}`}
          dangerouslySetInnerHTML={{ __html: ringsSvgMarkup(vitals) }}
        />
        <p className="display text-2xl mt-4">{name}</p>
        <div className="flex items-baseline justify-between gap-3 mt-1">
          <span className="label">{date}</span>
          <span className="readout text-[13px] text-muted">
            {vitals.trackCount} tracks
            {vitals.components.bpm ? ` · ${vitals.components.bpm.mean.toFixed(0)} bpm` : ''}
          </span>
        </div>
        {isPublic && <p className="label mt-2">Published</p>}
      </Link>
    </li>
  );
}
