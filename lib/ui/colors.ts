import { camelotHue } from '../parse/key';

export type Hsl = { h: number; s: number; l: number };

/**
 * The Camelot wheel is the palette. Hues are generated, never hand-picked, and
 * they are only ever used for key-derived data — never decoration.
 *
 * B keys (major) come back brighter and more saturated than A keys (minor).
 */
export function camelotHsl(number: number, letter: 'A' | 'B'): Hsl {
  const h = camelotHue(number);
  return letter === 'B' ? { h, s: 78, l: 62 } : { h, s: 44, l: 46 };
}

/** CSS color for the DOM and SVG. */
export function camelotColor(number: number, letter: 'A' | 'B'): string {
  const { h, s, l } = camelotHsl(number, letter);
  return `hsl(${h} ${s}% ${l}%)`;
}

/** three.js only parses the comma form of hsl(). */
export function camelotColorThree(number: number, letter: 'A' | 'B'): string {
  const { h, s, l } = camelotHsl(number, letter);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/** Same hue, dropped back for a ring that was never played. */
export function emptyRingColor(): string {
  return 'rgba(237, 231, 219, 0.08)';
}

/** The unplayed ring in 3D, where alpha lives on the material instead. */
export const EMPTY_RING_THREE = '#ede7db';
