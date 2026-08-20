import { camelotColor } from '@/lib/ui/colors';
import { parseCamelot } from '@/lib/parse/key';
import { buildTempoTrace, type TracePoint } from '@/lib/ui/tempoTrace';
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
 * Catmull-Rom control points, expressed as a cubic Bezier. Each segment's
 * tangent comes from its neighbours, so consecutive segments meet smoothly and
 * the whole line reads as one curve even though it is drawn a piece at a time —
 * which it has to be, because each piece takes the color of its own key.
 */
function curveTo(points: Pixel[], i: number): string {
  const p0 = points[i - 1] ?? points[i];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[i + 2] ?? p2;

  const c1x = p1.x + (p2.x - p0.x) / 6;
  const c1y = p1.y + (p2.y - p0.y) / 6;
  const c2x = p2.x - (p3.x - p1.x) / 6;
  const c2y = p2.y - (p3.y - p1.y) / 6;

  return `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
}

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
        {pixels.slice(0, -1).map((_, i) => (
          <path
            key={points[i].position}
            d={curveTo(pixels, i)}
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
      <p className="text-[13px] text-muted mt-1">
        The tempo your library has for each record. Where you actually set the pitch is not in the
        export, so this is the material you reached for, not the tempo you played it at.
      </p>
    </section>
  );
}
