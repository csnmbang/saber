import type { ParsedTrack } from '../parse/types';

/**
 * The shape of a set's tempo, as a series of points in normalized 0-1 space.
 * The component drawing it owns all the pixel decisions and the smoothing.
 *
 * An important limit, and the reason nothing here is called "played": the only
 * tempo in a rekordbox export is the analyzed tempo of the file. Where the
 * pitch fader actually sat is not in the export and cannot be recovered from
 * it. This describes the records that were selected, not the performance.
 */

export type TracePoint = {
  /** 0-1 across the set. Tracks are spaced by their length, so a long record occupies more width. */
  x: number;
  /** 0 at the set's slowest, 1 at its fastest. */
  y: number;
  bpm: number;
  camelot: string | null;
  position: number;
};

export type TempoTrace = {
  points: TracePoint[];
  minBpm: number;
  maxBpm: number;
};

/**
 * Build the trace. Returns null when there is nothing honest to draw — fewer
 * than two tracks carried a tempo, which is a point rather than a shape.
 *
 * Spacing uses track length where the export has it, so a ten-minute record
 * takes more width than a two-minute tool. When an export carries no lengths,
 * every track is spaced evenly: a uniform assumption rather than a per-track
 * invention.
 */
export function buildTempoTrace(tracks: ParsedTrack[]): TempoTrace | null {
  const withBpm = tracks.filter(
    (t): t is ParsedTrack & { bpm: number } => t.bpm !== null && Number.isFinite(t.bpm),
  );
  if (withBpm.length < 2) return null;

  const known = withBpm.map((t) => t.durationS).filter((d): d is number => d !== null && d > 0);
  const fallback = known.length > 0 ? known.reduce((s, d) => s + d, 0) / known.length : 1;
  const widths = withBpm.map((t) => (t.durationS && t.durationS > 0 ? t.durationS : fallback));
  const total = widths.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;

  const bpms = withBpm.map((t) => t.bpm);
  const minBpm = Math.min(...bpms);
  const maxBpm = Math.max(...bpms);
  const span = maxBpm - minBpm;

  let elapsed = 0;
  const points = withBpm.map((track, i) => {
    // Sit each track at the middle of the width it occupies.
    const x = (elapsed + widths[i] / 2) / total;
    elapsed += widths[i];
    return {
      x,
      // A set that never changed tempo draws down the middle rather than
      // dividing by a span of zero.
      y: span === 0 ? 0.5 : (track.bpm - minBpm) / span,
      bpm: track.bpm,
      camelot: track.camelot,
      position: track.position,
    };
  });

  return { points, minBpm, maxBpm };
}

export type Point = { x: number; y: number };

export type CurveSegment = { from: Point; c1: Point; c2: Point; to: Point };

/**
 * Catmull-Rom through the given points, expressed as cubic Beziers.
 *
 * Each segment takes its tangent from its neighbours, so consecutive segments
 * meet smoothly and the whole thing reads as one curve even when drawn a piece
 * at a time — which it has to be, because each piece is colored by its own key.
 *
 * Shared by the SVG on the page and the canvas in the export so a curve is the
 * same shape wherever it is drawn.
 */
export function curveSegments(points: Point[]): CurveSegment[] {
  const segments: CurveSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    });
  }
  return segments;
}
