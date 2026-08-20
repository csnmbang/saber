import { describe, expect, it } from 'vitest';
import { buildTempoTrace } from '@/lib/ui/tempoTrace';
import type { ParsedTrack } from '@/lib/parse/types';

function track(bpm: number | null, durationS: number | null, camelot: string | null = '8A'): ParsedTrack {
  return { position: 0, title: 't', artist: 'a', bpm, camelot, durationS, genre: null };
}

function positioned(tracks: ParsedTrack[]): ParsedTrack[] {
  return tracks.map((t, i) => ({ ...t, position: i + 1 }));
}

describe('buildTempoTrace', () => {
  it('spaces tracks by their length, so a long record takes more width', () => {
    const trace = buildTempoTrace(positioned([track(120, 600), track(126, 200)]))!;
    // Centres of a 600s run and a 200s run across 800s total.
    expect(trace.points[0].x).toBeCloseTo(300 / 800);
    expect(trace.points[1].x).toBeCloseTo(700 / 800);
  });

  it('scales height to the set own range, so a narrow set is still expressive', () => {
    const trace = buildTempoTrace(positioned([track(120, 300), track(123, 300), track(126, 300)]))!;
    expect(trace.minBpm).toBe(120);
    expect(trace.maxBpm).toBe(126);
    expect(trace.points.map((p) => p.y)).toEqual([0, 0.5, 1]);
  });

  it('draws down the middle when a set never changed tempo', () => {
    const trace = buildTempoTrace(positioned([track(124, 300), track(124, 300)]))!;
    expect(trace.points.every((p) => p.y === 0.5)).toBe(true);
  });

  it('spaces evenly when an export carries no track lengths', () => {
    const trace = buildTempoTrace(positioned([track(120, null), track(126, null)]))!;
    expect(trace.points.map((p) => p.x)).toEqual([0.25, 0.75]);
  });

  it('uses the average length for the odd track missing one', () => {
    const trace = buildTempoTrace(positioned([track(120, 300), track(126, null), track(124, 300)]))!;
    // The middle track borrows the mean of the two real lengths, so all three
    // come out equal rather than the untimed one collapsing to nothing.
    expect(trace.points[1].x).toBeCloseTo(0.5);
  });

  it('skips tracks with no tempo rather than inventing one', () => {
    const trace = buildTempoTrace(positioned([track(120, 300), track(null, 300), track(126, 300)]))!;
    expect(trace.points).toHaveLength(2);
    expect(trace.points.map((p) => p.position)).toEqual([1, 3]);
  });

  it('carries the key through so the line can be colored by it', () => {
    const trace = buildTempoTrace(
      positioned([track(120, 300, '8A'), track(126, 300, '9B')]),
    )!;
    expect(trace.points.map((p) => p.camelot)).toEqual(['8A', '9B']);
  });

  it('refuses to draw a shape from fewer than two tempos', () => {
    expect(buildTempoTrace(positioned([track(124, 300)]))).toBeNull();
    expect(buildTempoTrace(positioned([track(null, 300), track(null, 300)]))).toBeNull();
    expect(buildTempoTrace([])).toBeNull();
  });
});
