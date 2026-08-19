/**
 * Every tunable number in the analysis lives here. These are first-pass values
 * chosen to be defensible, not final — they are meant to be tuned against a
 * corpus of real sets, and moving one should never require touching logic.
 */

/** BPM spread (p90 - p10) that reads as a fully wide set. */
export const RANGE_BPM_FULL = 30;
/** Distinct Camelot keys that reads as a fully wide set. */
export const RANGE_KEYS_FULL = 8;

/** Harmonic at or above this is a tightly keyed set. */
export const HARMONIC_HIGH = 0.6;
/** Risk at or above this is a set that took a lot of big moves. */
export const RISK_HIGH = 0.4;

export const RANGE_WIDE = 0.5;
export const RANGE_NARROW = 0.25;

/** |rho| at or above this is a set with a direction. */
export const CLIMB_STEADY = 0.3;
/** |rho| below this is a set that held its tempo. */
export const CLIMB_FLAT = 0.15;

/** Bold share at or above this, with wide share at or below, is a tightrope walk. */
export const BOLD_HIGH = 0.25;
export const WIDE_LOW = 0.15;

/** Peak inside the first / last third of the set. */
export const PEAK_EARLY = 1 / 3;
export const PEAK_LATE = 2 / 3;
