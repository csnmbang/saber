import { camelotHue } from '../parse/key';

/**
 * The Camelot wheel is the palette. Hues are generated, never hand-picked, and
 * they are only ever used for key-derived data — never decoration.
 *
 * B keys (major) come back brighter and more saturated than A keys (minor).
 */
export function camelotColor(number: number, letter: 'A' | 'B'): string {
  const hue = camelotHue(number);
  return letter === 'B' ? `hsl(${hue} 78% 62%)` : `hsl(${hue} 44% 46%)`;
}

/** Same hue, dropped back for a ring that was never played. */
export function emptyRingColor(): string {
  return 'rgba(237, 231, 219, 0.08)';
}
