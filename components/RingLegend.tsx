import { parseCamelot } from '@/lib/parse/key';
import { camelotColor } from '@/lib/ui/colors';
import type { Vitals } from '@/lib/metrics/vitals';

/**
 * The legend is a readout, not a caption. It names the two rules in one line
 * and then spends its space on which keys the set actually sat in, longest
 * first — which is the thing the rings are showing.
 */
export function RingLegend({ vitals }: { vitals: Vitals }) {
  const { keyTimeShareByKey, bpm } = vitals.components;

  const played = Object.entries(keyTimeShareByKey)
    .filter(([, share]) => share > 0)
    .sort((a, b) => b[1] - a[1]);

  if (played.length === 0) return null;

  return (
    <div className="mt-5 w-full max-w-[480px]">
      <p className="label">
        {`ring = key · thickness = time${
          bpm ? ` · turning at ${bpm.mean.toFixed(0)} bpm` : ''
        }`}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {played.map(([key, share]) => {
          const parsed = parseCamelot(key);
          if (!parsed) return null;
          return (
            <li key={key} className="readout flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: camelotColor(parsed.number, parsed.letter) }}
              />
              <span>{key}</span>
              <span className="text-muted">{Math.round(share * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
