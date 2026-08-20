import { parseCamelot } from '../parse/key';
import { MIN_KEY_COVERAGE, type ParsedTrack } from '../parse/types';
import { transitionsOf, type TransitionKind } from './transitions';
import { findTempoPeaks, type TempoPeak } from './peaks';
import {
  CLIMB_FLAT,
  CLIMB_STEADY,
  PEAK_EARLY,
  RANGE_BPM_FULL,
  RANGE_KEYS_FULL,
} from './thresholds';

export type SetShape = 'front-loaded' | 'steady climb' | 'plateau' | 'wave';

export type Vitals = {
  trackCount: number;
  keyCoverage: number;
  /** Share of transitions that were Locked or Smooth. Null when keys are too sparse. */
  harmonic: number | null;
  /** Share of transitions that were Bold or Wide. Its own reading, never a penalty. */
  risk: number | null;
  /** BPM spread and key variety, combined. Null when there is no BPM data. */
  range: number | null;
  /** Spearman rho between position and BPM, -1 to 1. */
  climb: number | null;
  components: {
    transitions: Record<TransitionKind, number> & { classified: number };
    boldShare: number | null;
    wideShare: number | null;
    bpm: {
      min: number;
      max: number;
      mean: number;
      median: number;
      p10: number;
      p90: number;
      spread: number;
    } | null;
    distinctKeys: number;
    /** Share of set time spent in each Camelot number, 1-12. Drives the rings. */
    keyTimeShare: Record<number, number>;
    /** The same share split by full key, e.g. '8A' — the A/B mix inside each ring. */
    keyTimeShareByKey: Record<string, number>;
    /**
     * Share of set time per genre, exactly as the export spelled it. Weighted
     * by time played rather than track count, same as the key shares, so a
     * long opener counts for more than a two-minute tool. Empty when the
     * export carried no genre column — never guessed from anything else.
     */
    genreShare: Record<string, number>;
    /** Where the fastest track sat, 0 (first) to 1 (last). */
    peakPosition: number | null;
    /**
     * Every summit in the set's tempo, highest first — not just the global
     * maximum. A night that rises, drops the room, and rises again has two,
     * and which of them happens to be a tenth of a BPM higher is not
     * interesting enough to be the only one reported.
     */
    peaks: TempoPeak[];
    shape: SetShape | null;
  };
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Ranks with ties averaged, so Spearman survives a set full of 128s. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = rank;
    i = j + 1;
  }
  return out;
}

function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 3) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

/** Spearman correlation between two series. */
export function spearman(a: number[], b: number[]): number | null {
  return pearson(ranks(a), ranks(b));
}

function shapeOf(
  spread: number,
  rho: number | null,
  peak: number | null,
  peakCount: number,
): SetShape | null {
  if (rho === null && peak === null) return null;
  if (spread < 4) return 'plateau';
  // Checked before anything about where the highest point sat: a set with two
  // summits is a wave whichever one happens to be higher. Without this, a
  // two-peak night whose taller summit came early was called front-loaded,
  // which describes a completely different set.
  if (peakCount > 1) return 'wave';
  if (rho !== null && rho >= CLIMB_STEADY) return 'steady climb';
  if (peak !== null && peak <= PEAK_EARLY) return 'front-loaded';
  if (rho !== null && Math.abs(rho) < CLIMB_FLAT) return 'plateau';
  return 'wave';
}

export function computeVitals(tracks: ParsedTrack[]): Vitals {
  const keyed = tracks.filter((t) => t.camelot !== null);
  const keyCoverage = tracks.length === 0 ? 0 : keyed.length / tracks.length;
  const hasEnoughKeys = keyCoverage >= MIN_KEY_COVERAGE;

  // --- harmonic / risk -----------------------------------------------------
  const transitions = transitionsOf(tracks);
  const counts = { locked: 0, smooth: 0, bold: 0, wide: 0, classified: transitions.length };
  for (const t of transitions) counts[t.kind]++;

  const classified = counts.classified;
  const usable = hasEnoughKeys && classified > 0;
  const harmonic = usable ? (counts.locked + counts.smooth) / classified : null;
  const risk = usable ? (counts.bold + counts.wide) / classified : null;
  const boldShare = usable ? counts.bold / classified : null;
  const wideShare = usable ? counts.wide / classified : null;

  // --- bpm -----------------------------------------------------------------
  const withBpm = tracks.filter((t): t is ParsedTrack & { bpm: number } => t.bpm !== null);
  const bpmValues = withBpm.map((t) => t.bpm).sort((x, y) => x - y);
  const bpm = bpmValues.length
    ? {
        min: bpmValues[0],
        max: bpmValues[bpmValues.length - 1],
        mean: bpmValues.reduce((sum, v) => sum + v, 0) / bpmValues.length,
        median: percentile(bpmValues, 0.5),
        p10: percentile(bpmValues, 0.1),
        p90: percentile(bpmValues, 0.9),
        spread: percentile(bpmValues, 0.9) - percentile(bpmValues, 0.1),
      }
    : null;

  // --- range ---------------------------------------------------------------
  const distinctKeys = new Set(keyed.map((t) => t.camelot)).size;
  const rangeParts: number[] = [];
  if (bpm) rangeParts.push(Math.min(1, bpm.spread / RANGE_BPM_FULL));
  if (hasEnoughKeys) rangeParts.push(Math.min(1, distinctKeys / RANGE_KEYS_FULL));
  const range = rangeParts.length
    ? rangeParts.reduce((s, v) => s + v, 0) / rangeParts.length
    : null;

  // --- climb ---------------------------------------------------------------
  const climb = spearman(
    withBpm.map((t) => t.position),
    withBpm.map((t) => t.bpm),
  );
  let peakPosition: number | null = null;
  if (withBpm.length > 1) {
    const peak = withBpm.reduce((best, t) => (t.bpm > best.bpm ? t : best), withBpm[0]);
    peakPosition = (peak.position - 1) / (tracks.length - 1);
  }
  const peaks = findTempoPeaks(
    withBpm.map((t) => t.position),
    withBpm.map((t) => t.bpm),
    tracks.length,
  );

  // --- ring weights --------------------------------------------------------
  const keyTimeShare: Record<number, number> = {};
  const keyTimeShareByKey: Record<string, number> = {};
  for (let n = 1; n <= 12; n++) {
    keyTimeShare[n] = 0;
    keyTimeShareByKey[`${n}A`] = 0;
    keyTimeShareByKey[`${n}B`] = 0;
  }
  let totalWeight = 0;
  for (const t of keyed) {
    const c = parseCamelot(t.camelot);
    if (!c) continue;
    // Time spent is the honest weight; fall back to one unit per track when the
    // export carried no durations.
    const weight = t.durationS ?? 1;
    keyTimeShare[c.number] += weight;
    keyTimeShareByKey[`${c.number}${c.letter}`] += weight;
    totalWeight += weight;
  }
  if (totalWeight > 0) {
    for (let n = 1; n <= 12; n++) {
      keyTimeShare[n] /= totalWeight;
      keyTimeShareByKey[`${n}A`] /= totalWeight;
      keyTimeShareByKey[`${n}B`] /= totalWeight;
    }
  }

  // --- genre share -------------------------------------------------------
  const genreShare: Record<string, number> = {};
  let genreWeight = 0;
  for (const t of tracks) {
    const genre = t.genre?.trim();
    if (!genre) continue;
    const weight = t.durationS ?? 1;
    genreShare[genre] = (genreShare[genre] ?? 0) + weight;
    genreWeight += weight;
  }
  if (genreWeight > 0) {
    for (const genre of Object.keys(genreShare)) genreShare[genre] /= genreWeight;
  }

  return {
    trackCount: tracks.length,
    keyCoverage,
    harmonic,
    risk,
    range,
    climb,
    components: {
      transitions: counts,
      boldShare,
      wideShare,
      bpm,
      distinctKeys,
      keyTimeShare,
      keyTimeShareByKey,
      genreShare,
      peakPosition,
      peaks,
      shape: shapeOf(bpm?.spread ?? 0, climb, peakPosition, peaks.length),
    },
  };
}
