import { camelotColor } from '@/lib/ui/colors';
import { parseCamelot } from '@/lib/parse/key';
import { buildTempoTrace, curveSegments, type TracePoint } from '@/lib/ui/tempoTrace';
import type { TempoPeak } from '@/lib/metrics/peaks';
import type { ParsedTrack } from '@/lib/parse/types';

const W = 1000;
const H = 200;
const PAD_X = 10;
const PAD_TOP = 30;
const PAD_BOTTOM = 30;
const STROKE = 3.5;

const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

/** Cream, dimmed — for a track whose key the export never carried. */
const UNKEYED = 'rgba(237, 231, 219, 0.35)';

function segmentColor(camelot: string | null): string {
  const parsed = parseCamelot(camelot);
  return parsed ? camelotColor(parsed.number, parsed.letter) : UNKEYED;
}

type Pixel = { x: number; y: number };

/**
 * The tempo of the records across a set, curving between them and shifting hue
 * at every key change.
 *
 * This is the Climb reading made visible. The correlation above it is a good
 * number and a hard read — nobody feels 0.73 — where the shape of a night is
 * legible at a glance, including the case a single number handles worst: a set
 * with two separate peaks.
 */
export function TempoTrace({ tracks, peaks }: { tracks: ParsedTrack[]; peaks: TempoPeak[] }) {
  const trace = buildTempoTrace(tracks);
  if (!trace) return null;

  const { points, minBpm, maxBpm } = trace;
  const toPixel = (p: TracePoint): Pixel => ({
    x: PAD_X + p.x * PLOT_W,
    // Inset so the fastest and slowest records sit inside the frame rather
    // than on its edge.
    y: PAD_TOP + (1 - p.y) * PLOT_H * 0.84 + PLOT_H * 0.08,
  });

  const pixels = points.map(toPixel);
  const peakPositions = new Set(peaks.map((p) => p.position));

  return (
    <section>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Tempo across the set, ${minBpm.toFixed(0)} to ${maxBpm.toFixed(0)} BPM`}
      >
        {curveSegments(pixels).map((seg, i) => (
          <path
            key={points[i].position}
            d={`M ${seg.from.x} ${seg.from.y} C ${seg.c1.x} ${seg.c1.y}, ${seg.c2.x} ${seg.c2.y}, ${seg.to.x} ${seg.to.y}`}
            fill="none"
            stroke={segmentColor(points[i].camelot)}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        ))}

        {points.map((point, i) =>
          peakPositions.has(point.position) ? (
            <g key={`peak-${point.position}`}>
              <circle cx={pixels[i].x} cy={pixels[i].y} r={5} fill="#EDE7DB" />
              <text
                x={pixels[i].x}
                y={pixels[i].y - 14}
                textAnchor="middle"
                fill="#EDE7DB"
                fontSize={17}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                letterSpacing="1"
              >
                {point.bpm.toFixed(0)}
              </text>
            </g>
          ) : null,
        )}

        <text
          x={PAD_X}
          y={H - 6}
          fill="#8A8A8F"
          fontSize={15}
          fontFamily="var(--font-mono), ui-monospace, monospace"
          letterSpacing="1.5"
        >
          {`${minBpm.toFixed(0)}–${maxBpm.toFixed(0)} BPM AS TAGGED`}
        </text>
      </svg>
    </section>
  );
}
