import { HarmonicRings } from './HarmonicRings';
import { GenreBreakdown } from './GenreBreakdown';
import { resolveArchetype } from '@/lib/metrics/archetype';
import type { Vitals } from '@/lib/metrics/vitals';

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/**
 * One DJ across every night they've saved.
 *
 * Deliberately shows only what aggregates honestly. Harmonic and Risk are
 * exact — transitions are counts, summed. Tempo range is the true extremes.
 * Climb is left off entirely even though it computes: a Fisher-averaged rank
 * correlation across nights is defensible arithmetic but not a thing a DJ
 * would recognise about themselves, and the point of a signature is
 * recognition.
 */
export function Signature({ vitals, setCount }: { vitals: Vitals; setCount: number }) {
  const archetype = resolveArchetype(vitals);
  const { bpm, peakPosition } = vitals.components;

  return (
    <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center border-b border-line pb-12">
      <div>
        <p className="label">Your signature</p>
        <h2 className="display text-5xl mt-1">{archetype.name}</h2>
        <p className="mt-3 max-w-md text-muted text-[13px]">
          Across {setCount} {setCount === 1 ? 'night' : 'nights'} and {vitals.trackCount} tracks.
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="label">Harmonic</dt>
            <dd className="readout text-3xl">{pct(vitals.harmonic)}</dd>
          </div>
          <div>
            <dt className="label">Risk</dt>
            <dd className="readout text-3xl">{pct(vitals.risk)}</dd>
          </div>
          {bpm && (
            <div>
              <dt className="label">Usual tempo</dt>
              <dd className="readout text-3xl">{bpm.mean.toFixed(0)}</dd>
            </div>
          )}
          {peakPosition !== null && (
            <div>
              <dt className="label">You peak at</dt>
              <dd className="readout text-3xl">{Math.round(peakPosition * 100)}%</dd>
            </div>
          )}
        </dl>

        <GenreBreakdown vitals={vitals} />
      </div>

      <div>
        <HarmonicRings vitals={vitals} />
      </div>
    </section>
  );
}
