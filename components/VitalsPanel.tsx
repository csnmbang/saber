import type { Vitals } from '@/lib/metrics/vitals';

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function Reading({
  name,
  value,
  detail,
  note,
}: {
  name: string;
  value: string;
  detail: string;
  note: string;
}) {
  return (
    <div className="border-t border-line py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">{name}</span>
        <span className="readout text-2xl">{value}</span>
      </div>
      <div className="readout mt-1 text-[13px] text-muted">{detail}</div>
      <div className="mt-1 text-[13px] text-muted">{note}</div>
    </div>
  );
}

/**
 * Four independent readings. No overall score, no ranking — the interest is in
 * the spread between them, so each one states what it measured and nothing more.
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
            ? 'Not enough key data'
            : `${t.locked} locked · ${t.smooth} smooth · ${t.classified} transitions read`
        }
        note="How tightly the set was keyed. High is tighter, not better."
      />

      <Reading
        name="Risk"
        value={pct(vitals.risk)}
        detail={
          vitals.risk === null
            ? 'Not enough key data'
            : `${t.bold} bold · ${t.wide} wide`
        }
        note="Big moves, counted on their own terms — never a penalty against Harmonic."
      />

      <Reading
        name="Range"
        value={pct(vitals.range)}
        detail={
          c.bpm
            ? `${c.bpm.p10.toFixed(0)}–${c.bpm.p90.toFixed(0)} BPM · ${c.distinctKeys} keys touched`
            : 'No BPM data'
        }
        note="Tempo spread and key variety, combined."
      />

      <Reading
        name="Climb"
        value={vitals.climb === null ? '—' : vitals.climb.toFixed(2)}
        detail={
          c.peakPosition === null
            ? 'No BPM data'
            : `Shape: ${c.shape} · peak at ${Math.round(c.peakPosition * 100)}% through`
        }
        note="Correlation between position and tempo, from −1 to 1."
      />
    </section>
  );
}
