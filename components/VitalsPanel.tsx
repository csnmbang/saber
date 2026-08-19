import type { Vitals } from '@/lib/metrics/vitals';

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function Reading({ name, value, detail }: { name: string; value: string; detail: string }) {
  return (
    <div className="border-t border-line py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">{name}</span>
        <span className="readout text-2xl">{value}</span>
      </div>
      <div className="readout mt-1 text-[13px] text-muted">{detail}</div>
    </div>
  );
}

/**
 * Four independent readings. No overall score, no ranking. Each one states what
 * it counted and stops there — the audience knows what a Camelot number is.
 */
export function VitalsPanel({ vitals }: { vitals: Vitals }) {
  const c = vitals.components;
  const t = c.transitions;

  return (
    <section>
      <h2 className="display text-2xl mb-2">Vitals</h2>

      <Reading
        name="Harmonic"
        value={pct(vitals.harmonic)}
        detail={
          vitals.harmonic === null
            ? 'No key data'
            : `${t.locked} locked, ${t.smooth} smooth \u00b7 ${t.classified} transitions`
        }
      />

      <Reading
        name="Risk"
        value={pct(vitals.risk)}
        detail={
          vitals.risk === null ? 'No key data' : `${t.bold} bold, ${t.wide} wide \u00b7 ${t.classified} transitions`
        }
      />

      <Reading
        name="Range"
        value={pct(vitals.range)}
        detail={
          c.bpm
            ? `${c.bpm.p10.toFixed(0)} to ${c.bpm.p90.toFixed(0)} BPM, ${c.distinctKeys} keys`
            : 'No BPM data'
        }
      />

      <Reading
        name="Climb"
        value={vitals.climb === null ? '—' : vitals.climb.toFixed(2)}
        detail={
          c.peakPosition === null
            ? 'No BPM data'
            : `${c.shape}, peak at ${Math.round(c.peakPosition * 100)}%`
        }
      />
    </section>
  );
}
