/**
 * How one ring is cut into its two arcs.
 *
 * Every ring is drawn as two arcs with a gap at each junction, because a
 * closed torus turning about its own axis is pixel-identical frame to frame —
 * without a cut in it, a spinning ring looks completely still.
 *
 * The colors are the part that carries meaning, and the rule is strict: two
 * different colors on a ring mean the key was genuinely played in both its
 * minor (A) and its major (B), and nothing else. A key played in only one of
 * them is a single color, and the cut alone shows the rotation.
 */
export type RingSplit = {
  /** Where the first arc ends, as a fraction of the circle. */
  splitAt: number;
  firstLetter: 'A' | 'B';
  secondLetter: 'A' | 'B';
};

/**
 * @param aShare share of this key's played time in its minor (A) form, 0-1.
 */
export function ringSplit(aShare: number): RingSplit {
  const playedBoth = aShare > 0 && aShare < 1;
  if (playedBoth) {
    // The cut falls on the real boundary between the two, so its position is
    // itself data: how much of this key was minor versus major.
    return { splitAt: aShare, firstLetter: 'A', secondLetter: 'B' };
  }
  // Only one letter was played. Both arcs take it, so the ring reads as one
  // color; the split at half is arbitrary and carries no meaning beyond
  // letting the eye see the ring turn.
  const letter: 'A' | 'B' = aShare === 1 ? 'A' : 'B';
  return { splitAt: 0.5, firstLetter: letter, secondLetter: letter };
}

/** True only when this ring shows two colors — i.e. both letters were played. */
export function showsTwoColors(split: RingSplit): boolean {
  return split.firstLetter !== split.secondLetter;
}
