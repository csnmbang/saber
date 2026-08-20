import type { BeatportScore } from '@/lib/beatport/match';
import type { Vitals } from '@/lib/metrics/vitals';

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/**
 * Where the set peaked. Every summit gets named, in the order they were
 * played, because "two peaks" is a truer description of a long night than
 * whichever one happened to be a fraction of a BPM higher.
 */
function peakDetail(peaks: Vitals['components']['peaks'], fallback: number): string {
  if (peaks.length === 0) return `peak at ${Math.round(fallback * 100)}%`;

  const inPlayOrder = [...peaks].sort((a, b) => a.position - b.position);
  const at = inPlayOrder.map((p) => `${Math.round(p.at * 100)}%`).join(' and ');
  if (peaks.length === 1) return `peak at ${at}`;
  return `${peaks.length === 2 ? 'two' : peaks.length} peaks, at ${at}`;
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
 * Four independent readings, plus a fifth when there's a live Beatport chart
 * to check against. No overall score, no ranking. Each one states what it
 * counted and stops there — the audience knows what a Camelot number is.
 *
 * beatport is undefined while its fetch is still in flight and null once it
 * resolves with nothing to show (no chart data on this deployment yet) — both
 * render nothing here. That's deliberate: an absent chart is a gap in what
 * Saber itself has, not something true about this set, so it doesn't get a
 * "No data" row the way Harmonic or Range do for a sparse export.
 */
export function VitalsPanel({
  vitals,
  beatport,
}: {
  vitals: Vitals;
  beatport?: BeatportScore | null;
}) {
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
            ? `${c.bpm.p10.toFixed(0)} to ${c.bpm.p90.toFixed(0)} BPM as tagged, ${c.distinctKeys} keys`
            : 'No BPM data'
        }
      />

      <Reading
        name="Climb"
        value={vitals.climb === null ? '—' : vitals.climb.toFixed(2)}
        detail={c.peakPosition === null ? 'No BPM data' : `${c.shape}, ${peakDetail(c.peaks, c.peakPosition)}`}
      />

      {beatport && beatport.pct !== null && (
        <Reading
          name="Charting Now"
          value={`${beatport.matchedCount} of ${beatport.trackCount} tracks`}
          detail={
            beatport.matches.length === 0
              ? "None of these are on today's Top 100"
              : (() => {
                  const best = beatport.matches.reduce((min, m) =>
                    m.entry.rank < min.entry.rank ? m : min,
                  );
                  return `#${best.entry.rank} in ${best.entry.chartGenre}`;
                })()
          }
        />
      )}
    </section>
  );
}
