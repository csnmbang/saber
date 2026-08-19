import { camelotColor, emptyRingColor } from '@/lib/ui/colors';
import type { Vitals } from '@/lib/metrics/vitals';

const SIZE = 480;
const CENTER = SIZE / 2;
const INNER_R = 44;
const OUTER_R = 228;
const MIN_W = 1.25;
const MAX_W = 15;

/**
 * The flat 2D Harmonic Rings — twelve concentric rings, one per Camelot number,
 * thickness by how much set time was spent there, hue from the wheel.
 *
 * This is the version that renders without WebGL: it is the reduced-motion
 * fallback and the source for the OG card, so it stays pure SVG with no client
 * JavaScript.
 */
export function Rings2D({ vitals }: { vitals: Vitals }) {
  const { keyTimeShare, keyTimeShareByKey } = vitals.components;
  const max = Math.max(...Object.values(keyTimeShare));
  const step = (OUTER_R - INNER_R) / 11;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto max-w-[480px]"
      role="img"
      aria-label="Harmonic rings: one ring per Camelot key, thicker where more of the set was played"
    >
      {Array.from({ length: 12 }, (_, i) => {
        const number = i + 1;
        const r = INNER_R + i * step;
        const share = keyTimeShare[number] ?? 0;
        const a = keyTimeShareByKey[`${number}A`] ?? 0;
        const b = keyTimeShareByKey[`${number}B`] ?? 0;
        const width = max > 0 && share > 0 ? MIN_W + (share / max) * (MAX_W - MIN_W) : MIN_W;
        const circumference = 2 * Math.PI * r;

        if (share === 0) {
          return (
            <circle
              key={number}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke={emptyRingColor()}
              strokeWidth={MIN_W}
            />
          );
        }

        // Split the ring between its minor and major halves, in proportion.
        const aLength = circumference * (a / share);
        const bLength = circumference - aLength;

        return (
          <g key={number} transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {a > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke={camelotColor(number, 'A')}
                strokeWidth={width}
                strokeDasharray={`${aLength} ${circumference}`}
                strokeLinecap="butt"
              />
            )}
            {b > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke={camelotColor(number, 'B')}
                strokeWidth={width}
                strokeDasharray={`${bLength} ${circumference}`}
                strokeDashoffset={-aLength}
                strokeLinecap="butt"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
