import { MIN_KEY_COVERAGE } from '../parse/types';
import { RANGE_BPM_FULL, RANGE_KEYS_FULL } from './thresholds';
import type { Vitals } from './vitals';

/**
 * One DJ's readings across every set they've saved: not a night, but a habit.
 *
 * Some of this aggregates exactly and some of it does not, and the difference
 * matters enough to say per field rather than in one hand-wave:
 *
 *   Exact. Transitions are counts, so summing them across nights and dividing
 *   gives the true Harmonic and Risk over everything played — not a mean of
 *   means, the real figure.
 *
 *   Weighted. Key and genre shares are already normalized per set, so they are
 *   recombined weighted by track count. A forty-track night therefore counts
 *   for more than a ten-track one, which is the intent. Track count is used
 *   rather than minutes because it is what a stored set carries.
 *
 *   Transformed. Climb is a rank correlation, and averaging correlations
 *   directly is wrong — the scale is not linear near its ends. They go through
 *   a Fisher z-transform, get averaged there, and come back. That is the
 *   standard method and it is why this reads as a real number rather than a
 *   plausible one.
 *
 *   Dropped. Peaks are the shape of one night. There is no honest way to
 *   combine them, so a signature has none rather than an invented list.
 */

/** atanh, guarded against ±1 where it runs to infinity. */
function fisherZ(rho: number): number {
  const clamped = Math.min(0.9999, Math.max(-0.9999, rho));
  return Math.atanh(clamped);
}

function weightedMean(pairs: [number, number][]): number | null {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  return pairs.reduce((sum, [v, w]) => sum + v * w, 0) / total;
}

/**
 * Build a signature from saved sets. Returns null for an empty profile — one
 * set is a set, not yet a habit, but it still aggregates fine, so the only
 * refusal here is having nothing at all.
 */
export function buildSignature(sets: Vitals[]): Vitals | null {
  if (sets.length === 0) return null;

  const weights = sets.map((v) => Math.max(1, v.trackCount));

  // --- exact: transitions are counts ---------------------------------------
  const transitions = { locked: 0, smooth: 0, bold: 0, wide: 0, classified: 0 };
  for (const v of sets) {
    transitions.locked += v.components.transitions.locked;
    transitions.smooth += v.components.transitions.smooth;
    transitions.bold += v.components.transitions.bold;
    transitions.wide += v.components.transitions.wide;
    transitions.classified += v.components.transitions.classified;
  }
  const classified = transitions.classified;
  const keyCoverage = weightedMean(sets.map((v, i) => [v.keyCoverage, weights[i]])) ?? 0;
  const usable = classified > 0 && keyCoverage >= MIN_KEY_COVERAGE;

  const harmonic = usable ? (transitions.locked + transitions.smooth) / classified : null;
  const risk = usable ? (transitions.bold + transitions.wide) / classified : null;

  // --- weighted: shares already normalized per set --------------------------
  const keyTimeShare: Record<number, number> = {};
  const keyTimeShareByKey: Record<string, number> = {};
  for (let n = 1; n <= 12; n++) {
    keyTimeShare[n] = 0;
    keyTimeShareByKey[`${n}A`] = 0;
    keyTimeShareByKey[`${n}B`] = 0;
  }
  const genreShare: Record<string, number> = {};
  let shareWeight = 0;

  sets.forEach((v, i) => {
    const w = weights[i];
    shareWeight += w;
    for (let n = 1; n <= 12; n++) {
      keyTimeShare[n] += (v.components.keyTimeShare[n] ?? 0) * w;
      keyTimeShareByKey[`${n}A`] += (v.components.keyTimeShareByKey[`${n}A`] ?? 0) * w;
      keyTimeShareByKey[`${n}B`] += (v.components.keyTimeShareByKey[`${n}B`] ?? 0) * w;
    }
    for (const [genre, share] of Object.entries(v.components.genreShare)) {
      genreShare[genre] = (genreShare[genre] ?? 0) + share * w;
    }
  });

  if (shareWeight > 0) {
    for (let n = 1; n <= 12; n++) {
      keyTimeShare[n] /= shareWeight;
      keyTimeShareByKey[`${n}A`] /= shareWeight;
      keyTimeShareByKey[`${n}B`] /= shareWeight;
    }
    for (const genre of Object.keys(genreShare)) genreShare[genre] /= shareWeight;
  }

  const distinctKeys = Object.values(keyTimeShareByKey).filter((s) => s > 0).length;

  // --- tempo ----------------------------------------------------------------
  const withBpm = sets.map((v, i) => ({ bpm: v.components.bpm, w: weights[i] })).filter((x) => x.bpm);
  const bpm =
    withBpm.length > 0
      ? {
          min: Math.min(...withBpm.map((x) => x.bpm!.min)),
          max: Math.max(...withBpm.map((x) => x.bpm!.max)),
          mean: weightedMean(withBpm.map((x) => [x.bpm!.mean, x.w] as [number, number]))!,
          median: weightedMean(withBpm.map((x) => [x.bpm!.median, x.w] as [number, number]))!,
          p10: weightedMean(withBpm.map((x) => [x.bpm!.p10, x.w] as [number, number]))!,
          p90: weightedMean(withBpm.map((x) => [x.bpm!.p90, x.w] as [number, number]))!,
          spread: weightedMean(withBpm.map((x) => [x.bpm!.spread, x.w] as [number, number]))!,
        }
      : null;

  // --- transformed: correlations do not average directly --------------------
  const climbs = sets
    .map((v, i) => [v.climb, weights[i]] as [number | null, number])
    .filter((pair): pair is [number, number] => pair[0] !== null);
  const climb =
    climbs.length > 0
      ? Math.tanh(weightedMean(climbs.map(([r, w]) => [fisherZ(r), w] as [number, number]))!)
      : null;

  const peakPositions = sets
    .map((v, i) => [v.components.peakPosition, weights[i]] as [number | null, number])
    .filter((pair): pair is [number, number] => pair[0] !== null);
  const peakPosition = peakPositions.length > 0 ? weightedMean(peakPositions) : null;

  // --- range, rebuilt from the aggregate rather than averaged ---------------
  const rangeParts: number[] = [];
  if (bpm) rangeParts.push(Math.min(1, bpm.spread / RANGE_BPM_FULL));
  if (usable) rangeParts.push(Math.min(1, distinctKeys / RANGE_KEYS_FULL));
  const range = rangeParts.length
    ? rangeParts.reduce((s, v) => s + v, 0) / rangeParts.length
    : null;

  return {
    trackCount: sets.reduce((sum, v) => sum + v.trackCount, 0),
    keyCoverage,
    harmonic,
    risk,
    range,
    climb,
    components: {
      transitions,
      boldShare: usable ? transitions.bold / classified : null,
      wideShare: usable ? transitions.wide / classified : null,
      bpm,
      distinctKeys,
      keyTimeShare,
      keyTimeShareByKey,
      genreShare,
      peakPosition,
      // The shape of one night. Nothing honest to combine.
      peaks: [],
      shape: null,
    },
  };
}
