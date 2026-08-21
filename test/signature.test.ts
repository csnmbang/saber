import { describe, expect, it } from 'vitest';
import { buildSignature } from '@/lib/metrics/signature';
import { computeVitals } from '@/lib/metrics/vitals';
import type { ParsedTrack } from '@/lib/parse/types';

function set(rows: [number, string][], genre = 'House'): ParsedTrack[] {
  return rows.map(([bpm, camelot], i) => ({
    position: i + 1,
    title: `t${i}`,
    artist: 'a',
    bpm,
    camelot,
    durationS: 300,
    genre,
  }));
}

describe('buildSignature', () => {
  it('has nothing to say about an empty profile', () => {
    expect(buildSignature([])).toBeNull();
  });

  it('returns a single set essentially unchanged', () => {
    const v = computeVitals(set([[124, '8A'], [124, '9A'], [126, '9A']]));
    const sig = buildSignature([v])!;
    expect(sig.harmonic).toBeCloseTo(v.harmonic!);
    expect(sig.trackCount).toBe(3);
  });

  it('sums transitions exactly rather than averaging percentages', () => {
    // 10 transitions all smooth, and 2 all wide. A mean of means would say
    // 50% harmonic; the truth is 10 of 12.
    const tight = computeVitals(set(Array.from({ length: 11 }, (_, i) => [124, i % 2 ? '9A' : '8A'])));
    const loose = computeVitals(set([[124, '8A'], [124, '2B'], [124, '8A']]));
    const sig = buildSignature([tight, loose])!;

    const totalLocked = tight.components.transitions.locked + loose.components.transitions.locked;
    const totalSmooth = tight.components.transitions.smooth + loose.components.transitions.smooth;
    const totalClassified =
      tight.components.transitions.classified + loose.components.transitions.classified;
    expect(sig.components.transitions.classified).toBe(totalClassified);
    expect(sig.harmonic).toBeCloseTo((totalLocked + totalSmooth) / totalClassified);

    const meanOfMeans = (tight.harmonic! + loose.harmonic!) / 2;
    expect(sig.harmonic).not.toBeCloseTo(meanOfMeans, 3);
  });

  it('weights a longer set more heavily in the key shares', () => {
    const long = computeVitals(set(Array.from({ length: 20 }, () => [124, '8A'] as [number, string])));
    const short = computeVitals(set([[124, '1A'], [124, '1A']]));
    const sig = buildSignature([long, short])!;
    expect(sig.components.keyTimeShare[8]).toBeGreaterThan(sig.components.keyTimeShare[1]);
  });

  it('sums key shares back to 1', () => {
    const sig = buildSignature([
      computeVitals(set([[124, '8A'], [126, '9A']])),
      computeVitals(set([[120, '1A'], [122, '2B']])),
    ])!;
    const total = Object.values(sig.components.keyTimeShare).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1);
  });

  it('averages climb through a Fisher transform, not directly', () => {
    // Two perfectly opposed nights average to zero either way; the transform
    // matters at the ends, so check it survives them without blowing up.
    const up = computeVitals(set([[120, '8A'], [124, '8A'], [128, '8A'], [132, '8A']]));
    const down = computeVitals(set([[132, '8A'], [128, '8A'], [124, '8A'], [120, '8A']]));
    const sig = buildSignature([up, down])!;
    expect(sig.climb).toBeCloseTo(0, 5);
    expect(Number.isFinite(sig.climb!)).toBe(true);
  });

  it('keeps tempo range as the true extremes across every night', () => {
    const sig = buildSignature([
      computeVitals(set([[118, '8A'], [122, '9A']])),
      computeVitals(set([[128, '1A'], [134, '2B']])),
    ])!;
    expect(sig.components.bpm!.min).toBe(118);
    expect(sig.components.bpm!.max).toBe(134);
  });

  it('carries no peaks, because the shape of one night does not combine', () => {
    const sig = buildSignature([
      computeVitals(set([[120, '8A'], [130, '9A'], [124, '9A']])),
      computeVitals(set([[120, '1A'], [128, '2A'], [122, '2A']])),
    ])!;
    expect(sig.components.peaks).toEqual([]);
    expect(sig.components.shape).toBeNull();
  });

  it('combines genres across nights, weighted the same way', () => {
    const sig = buildSignature([
      computeVitals(set([[124, '8A'], [124, '9A']], 'House')),
      computeVitals(set([[124, '1A'], [124, '2A']], 'Techno')),
    ])!;
    expect(sig.components.genreShare['House']).toBeCloseTo(0.5);
    expect(sig.components.genreShare['Techno']).toBeCloseTo(0.5);
  });

  it('reports where the DJ usually peaks, across nights', () => {
    // Both peak at the very end, so the habit is a late peak.
    const sig = buildSignature([
      computeVitals(set([[120, '8A'], [124, '8A'], [130, '8A']])),
      computeVitals(set([[120, '1A'], [122, '1A'], [128, '1A']])),
    ])!;
    expect(sig.components.peakPosition).toBeCloseTo(1);
  });
});
