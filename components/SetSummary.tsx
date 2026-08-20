import { GenreBreakdown } from './GenreBreakdown';
import { HarmonicRings } from './HarmonicRings';
import { RingLegend } from './RingLegend';
import { TempoTrace } from './TempoTrace';
import { VitalsPanel } from './VitalsPanel';
import type { BeatportScore } from '@/lib/beatport/match';
import { resolveArchetype, type ReadingKey } from '@/lib/metrics/archetype';
import type { Vitals } from '@/lib/metrics/vitals';
import type { ParsedTrack } from '@/lib/parse/types';

const READING_LABEL: Record<ReadingKey, string> = {
  harmonic: 'Harmonic',
  risk: 'Risk',
  range: 'Range',
  climb: 'Climb',
};

export function readingValue(vitals: Vitals, key: ReadingKey): string {
  if (key === 'climb') return vitals.climb === null ? '—' : vitals.climb.toFixed(2);
  const v = vitals[key];
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/**
 * The reading itself: archetype, rings, vitals. Shared by the page you land on
 * after a drop and the page someone else opens from a link, so both always
 * show the same thing.
 */
export function SetSummary({
  vitals,
  meta,
  beatport,
  tracks,
}: {
  vitals: Vitals;
  meta?: string;
  beatport?: BeatportScore | null;
  /**
   * Present on a set that was just read or one loaded from the database, and
   * absent behind a share link, which carries the readings rather than the
   * tracklist. The tempo trace needs per-track tempo, so it draws only where
   * that is genuinely available.
   */
  tracks?: ParsedTrack[];
}) {
  const archetype = resolveArchetype(vitals);

  return (
    <>
      <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div>
          <p className="label">Archetype</p>
          <h2 className="display text-6xl mt-1">{archetype.name}</h2>
          <p className="mt-3 max-w-md">{archetype.blurb}</p>
          <dl className="mt-6 flex gap-10">
            {archetype.drivers.map((key) => (
              <div key={key}>
                <dt className="label">{READING_LABEL[key]}</dt>
                <dd className="readout text-3xl">{readingValue(vitals, key)}</dd>
              </div>
            ))}
          </dl>
          {meta && <p className="label mt-8">{meta}</p>}
          <GenreBreakdown vitals={vitals} />
        </div>
        <div>
          <HarmonicRings vitals={vitals} />
          <RingLegend vitals={vitals} />
        </div>
      </section>

      <VitalsPanel vitals={vitals} beatport={beatport} />

      {tracks && <TempoTrace tracks={tracks} peaks={vitals.components.peaks} />}
    </>
  );
}
