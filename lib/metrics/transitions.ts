import { parseCamelot, wheelDistance, wheelStepsForward } from '../parse/key';
import type { ParsedTrack } from '../parse/types';

export type TransitionKind = 'locked' | 'smooth' | 'bold' | 'wide';

export type Transition = {
  /** 1-based position of the outgoing track. */
  from: number;
  to: number;
  fromKey: string;
  toKey: string;
  kind: TransitionKind;
};

/**
 * Classify one key change. Number arithmetic wraps around the 12-spoke wheel.
 * Order matters: locked, then smooth, then bold, then everything else is wide.
 */
export function classifyTransition(a: string, b: string): TransitionKind | null {
  const from = parseCamelot(a);
  const to = parseCamelot(b);
  if (!from || !to) return null;

  if (from.number === to.number && from.letter === to.letter) return 'locked';

  const sameLetter = from.letter === to.letter;
  const distance = wheelDistance(from.number, to.number);

  // Same number, opposite letter: relative major/minor.
  if (from.number === to.number) return 'smooth';
  if (sameLetter && distance === 1) return 'smooth';

  // Dominant lift, +7 clockwise. Also ±2 on the same ring.
  if (sameLetter && wheelStepsForward(from.number, to.number) === 7) return 'bold';
  if (sameLetter && distance === 2) return 'bold';

  return 'wide';
}

/**
 * Classify every adjacent pair. Pairs where either key is unknown are dropped
 * entirely — they are missing data, not failed mixes, and must not land in the
 * denominator.
 */
export function transitionsOf(tracks: ParsedTrack[]): Transition[] {
  const out: Transition[] = [];
  for (let i = 0; i < tracks.length - 1; i++) {
    const a = tracks[i];
    const b = tracks[i + 1];
    if (!a.camelot || !b.camelot) continue;
    const kind = classifyTransition(a.camelot, b.camelot);
    if (!kind) continue;
    out.push({
      from: a.position,
      to: b.position,
      fromKey: a.camelot,
      toKey: b.camelot,
      kind,
    });
  }
  return out;
}
