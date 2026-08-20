import { describe, expect, it } from 'vitest';
import { findTempoPeaks } from '@/lib/metrics/peaks';

/** Positions 1..n paired with the given tempos. */
function peaks(bpms: number[], minProminence?: number) {
  const positions = bpms.map((_, i) => i + 1);
  return findTempoPeaks(positions, bpms, bpms.length, minProminence);
}

describe('findTempoPeaks', () => {
  it('finds the single summit of a straight climb', () => {
    const found = peaks([120, 122, 124, 126, 130]);
    expect(found).toHaveLength(1);
    expect(found[0].bpm).toBe(130);
    expect(found[0].at).toBe(1);
  });

  it('finds both summits of a two-peak set', () => {
    // Up to 130, down to 120, up to 132 — a real dip between two real peaks.
    const found = peaks([120, 126, 130, 124, 120, 125, 132, 128]);
    expect(found).toHaveLength(2);
    expect(found.map((p) => p.bpm)).toEqual([132, 130]);
    // Highest first, but the earlier peak is still reported.
    expect(found.map((p) => p.position).sort((a, b) => a - b)).toEqual([3, 7]);
  });

  it('does not call a small wobble a second peak', () => {
    // The 127 dips only 1 BPM before rising again: a shoulder, not a summit.
    const found = peaks([120, 124, 127, 126, 130, 128]);
    expect(found).toHaveLength(1);
    expect(found[0].bpm).toBe(130);
  });

  it('separates peaks only when the dip is deep enough', () => {
    const series = [120, 130, 126, 131, 122];
    // A 4 BPM dip counts at the default threshold of 3...
    expect(peaks(series)).toHaveLength(2);
    // ...but not if a set needs a bigger move to count.
    expect(peaks(series, 6)).toHaveLength(1);
  });

  it('reports where in the night each peak fell, not where among timed tracks', () => {
    const found = findTempoPeaks([2, 6, 10], [120, 132, 124], 11);
    expect(found[0].bpm).toBe(132);
    expect(found[0].at).toBeCloseTo(0.5); // position 6 of 11
  });

  it('treats a flat top as one peak, not several', () => {
    const found = peaks([120, 128, 128, 128, 121]);
    expect(found).toHaveLength(1);
    expect(found[0].bpm).toBe(128);
  });

  it('finds nothing in a set that never changed tempo', () => {
    expect(peaks([124, 124, 124, 124])).toEqual([]);
  });

  it('finds nothing to report for an empty or single-track set', () => {
    expect(peaks([])).toEqual([]);
    expect(findTempoPeaks([1], [124], 1)).toEqual([]);
  });

  it('does not count a monotonic fall as having an interior peak', () => {
    const found = peaks([132, 128, 124, 120]);
    expect(found.map((p) => p.position)).toEqual([1]);
  });
});
