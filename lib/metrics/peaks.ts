/**
 * Finding the peaks in a set's tempo.
 *
 * A single global maximum is a bad description of a long night. A set that
 * rises, drops the room down, then rises again has two peaks, and reporting
 * only the higher one throws away the more interesting half — worse, when the
 * two are within a fraction of a BPM of each other, which of them gets
 * reported is effectively arbitrary.
 *
 * Peaks are found by prominence, the standard measure: how far a local maximum
 * rises above the deepest valley separating it from any higher ground. A bump
 * on the side of a bigger climb has low prominence and is not a peak; a genuine
 * second summit with a real dip before it has high prominence and is.
 */

export type TempoPeak = {
  /** 1-based position of the peak track in the set. */
  position: number;
  bpm: number;
  /** 0 (first track) to 1 (last), across the whole set. */
  at: number;
  /** How far this peak rises above the valley that separates it from higher ground. */
  prominence: number;
};

/**
 * How much a tempo has to fall and rise again to count as a separate peak.
 * Absolute BPM rather than a share of the set's range, because tempo is an
 * absolute perceptual scale: a 3 BPM dip and recovery reads as a real move
 * whether the set spans 6 BPM or 30. Tunable, like everything in thresholds.
 */
export const MIN_PEAK_PROMINENCE = 3;

/** Indices of local maxima, treating a flat run as a single peak at its centre. */
function localMaxima(values: number[]): number[] {
  const peaks: number[] = [];
  let i = 0;
  while (i < values.length) {
    let end = i;
    while (end + 1 < values.length && values[end + 1] === values[i]) end++;

    const risesInto = i === 0 || values[i] > values[i - 1];
    const fallsOut = end === values.length - 1 || values[end] > values[end + 1];
    // A run at the very start or end counts only if the series moves away from
    // it downward — otherwise it is a shoulder, not a summit.
    if (risesInto && fallsOut) peaks.push(Math.floor((i + end) / 2));

    i = end + 1;
  }
  return peaks;
}

/**
 * Prominence of the maximum at `index`: scan outward each way until the series
 * exceeds it, tracking the lowest point along the way. The shallower of the two
 * valleys is what separates this peak from higher ground.
 *
 * A peak sitting at the very first or last track has no series on one side. It
 * is measured against the side that exists rather than against nothing — a set
 * that climbs all night and ends at its fastest has a real peak at the end, and
 * treating the missing side as a valley of zero depth would erase it.
 */
function prominenceAt(values: number[], index: number): number {
  const height = values[index];

  let leftValley: number | null = null;
  for (let i = index - 1; i >= 0; i--) {
    if (values[i] > height) break;
    leftValley = Math.min(leftValley ?? values[i], values[i]);
  }

  let rightValley: number | null = null;
  for (let i = index + 1; i < values.length; i++) {
    if (values[i] > height) break;
    rightValley = Math.min(rightValley ?? values[i], values[i]);
  }

  if (leftValley === null && rightValley === null) return 0;
  if (leftValley === null) return height - rightValley!;
  if (rightValley === null) return height - leftValley;
  return height - Math.max(leftValley, rightValley);
}

/**
 * The peaks in a tempo series, highest first. `positions` and `bpms` are
 * parallel, in play order. `trackCount` is the length of the whole set, so a
 * peak's `at` is its place in the night rather than its place among the tracks
 * that happened to carry a BPM.
 */
export function findTempoPeaks(
  positions: number[],
  bpms: number[],
  trackCount: number,
  minProminence = MIN_PEAK_PROMINENCE,
): TempoPeak[] {
  if (bpms.length === 0 || trackCount < 2) return [];
  // A set that held one tempo the whole way has no peak, only a level.
  if (Math.max(...bpms) === Math.min(...bpms)) return [];

  const candidates = localMaxima(bpms)
    .map((i) => ({
      position: positions[i],
      bpm: bpms[i],
      at: (positions[i] - 1) / (trackCount - 1),
      prominence: prominenceAt(bpms, i),
    }))
    .sort((a, b) => b.bpm - a.bpm || a.position - b.position);

  if (candidates.length === 0) return [];

  // The highest point of a set is its peak by definition, whatever the shape
  // around it. Every other summit has to earn the name with a real dip.
  const [highest, ...rest] = candidates;
  return [highest, ...rest.filter((peak) => peak.prominence >= minProminence)].sort(
    (a, b) => b.bpm - a.bpm || a.position - b.position,
  );
}
