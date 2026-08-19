/**
 * The platter's rotation, as arithmetic rather than as something to be judged by
 * eye. A turntable runs clockwise seen from above, and in three.js a positive
 * rotation about +Z is counter-clockwise from a camera on +Z — which is where
 * ours sits — so the platter angle runs negative.
 */

/** One revolution per this many beats. A DJ counts in phrases, so use one. */
export const BEATS_PER_TURN = 16;
/** Nothing to turn at when the export carried no tempo. */
export const NO_TEMPO_SPIN = 0.24;

/** Radians per second for a set at this tempo. */
export function spinFor(bpm: number | null | undefined): number {
  if (!bpm) return NO_TEMPO_SPIN;
  return ((bpm / 60) * Math.PI * 2) / BEATS_PER_TURN;
}

/** The platter's own angle after `elapsed` seconds. Negative, i.e. clockwise. */
export function platterAngle(elapsed: number, spin: number): number {
  return -elapsed * spin;
}

/**
 * Where a mark sitting at `markAngle` on the platter appears on screen, as an
 * angle measured counter-clockwise from three o'clock. The stack is tilted about
 * X, which foreshortens the vertical axis but does not mirror it while the tilt
 * stays inside a quarter turn.
 */
export function screenAngle(markAngle: number, elapsed: number, spin: number, tilt: number): number {
  const angle = markAngle + platterAngle(elapsed, spin);
  return Math.atan2(Math.sin(angle) * Math.cos(tilt), Math.cos(angle));
}
