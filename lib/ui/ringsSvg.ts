import { camelotColor, emptyRingColor } from './colors';
import type { Vitals } from '../metrics/vitals';

const SIZE = 480;
const CENTER = SIZE / 2;
const INNER_R = 44;
const OUTER_R = 228;
const MIN_W = 1.25;
const MAX_W = 15;

/**
 * The Harmonic Rings as an SVG string.
 *
 * One closed ring per Camelot number: thickness is how much of the set was
 * spent in that key, and the ring is split between its minor and major halves
 * in proportion. Keys never played stay as hairlines, so the whole wheel is
 * always present and the fingerprint is the shape of what fills it.
 *
 * The result page and the share card both render this, so a set looks identical
 * wherever someone sees it.
 */
export function ringsSvgMarkup(vitals: Vitals): string {
  const { keyTimeShare, keyTimeShareByKey } = vitals.components;
  const max = Math.max(...Object.values(keyTimeShare));
  const step = (OUTER_R - INNER_R) / 11;
  const parts: string[] = [];

  for (let i = 0; i < 12; i++) {
    const number = i + 1;
    const r = INNER_R + i * step;
    const share = keyTimeShare[number] ?? 0;
    const circumference = 2 * Math.PI * r;

    if (share === 0 || max === 0) {
      parts.push(
        `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" fill="none" stroke="${emptyRingColor()}" stroke-width="${MIN_W}"/>`,
      );
      continue;
    }

    const width = MIN_W + (share / max) * (MAX_W - MIN_W);
    const aLength = circumference * ((keyTimeShareByKey[`${number}A`] ?? 0) / share);
    const bLength = circumference - aLength;

    if (aLength > 0) {
      parts.push(
        `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" fill="none"` +
          ` stroke="${camelotColor(number, 'A')}" stroke-width="${width}"` +
          ` stroke-dasharray="${aLength} ${circumference}"/>`,
      );
    }
    if (bLength > 0) {
      parts.push(
        `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" fill="none"` +
          ` stroke="${camelotColor(number, 'B')}" stroke-width="${width}"` +
          ` stroke-dasharray="${bLength} ${circumference}"` +
          ` stroke-dashoffset="${-aLength}"/>`,
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    `<g transform="rotate(-90 ${CENTER} ${CENTER})">${parts.join('')}</g>` +
    `</svg>`
  );
}

/** The same markup as a data URI, for anywhere that can only take an image. */
export function ringsDataUri(vitals: Vitals): string {
  return `data:image/svg+xml;base64,${Buffer.from(ringsSvgMarkup(vitals)).toString('base64')}`;
}
