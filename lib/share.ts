import { MIN_KEY_COVERAGE } from './parse/types';
import type { SetShape, Vitals } from './metrics/vitals';

/**
 * A shared set travels in the URL, not in a database.
 *
 * Only the aggregate readings are encoded. The tracklist never leaves the
 * uploader's browser, so a link cannot leak unreleased IDs or a crate — which
 * is the whole reason publishing has to be safe by default rather than by
 * policy.
 */
type Payload = {
  v: 1;
  /** locked, smooth, bold, wide */
  t: [number, number, number, number];
  /** track count, keyed track count */
  n: [number, number];
  /** mean, p10, p90 BPM, rounded. Empty when the export had no tempo. */
  b: [number, number, number] | null;
  /** climb rho and peak position, both x100 */
  c: [number, number] | null;
  s: SetShape | null;
  /** played keys as { '8A': per-mille of set time } */
  k: Record<string, number>;
};

const SHAPES: SetShape[] = ['front-loaded', 'steady climb', 'plateau', 'wave'];

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare(vitals: Vitals): string {
  const c = vitals.components;
  const keys: Record<string, number> = {};
  for (const [key, share] of Object.entries(c.keyTimeShareByKey)) {
    if (share > 0) keys[key] = Math.round(share * 1000);
  }

  const payload: Payload = {
    v: 1,
    t: [c.transitions.locked, c.transitions.smooth, c.transitions.bold, c.transitions.wide],
    n: [vitals.trackCount, Math.round(vitals.keyCoverage * vitals.trackCount)],
    b: c.bpm ? [Math.round(c.bpm.mean), Math.round(c.bpm.p10), Math.round(c.bpm.p90)] : null,
    c:
      vitals.climb === null || c.peakPosition === null
        ? null
        : [Math.round(vitals.climb * 100), Math.round(c.peakPosition * 100)],
    s: c.shape,
    k: keys,
  };

  return toBase64Url(JSON.stringify(payload));
}

/** Rebuild the readings from a link. Returns null for anything malformed. */
export function decodeShare(code: string): Vitals | null {
  let payload: Payload;
  try {
    payload = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!payload || payload.v !== 1 || !Array.isArray(payload.t) || !payload.k) return null;

  const [locked, smooth, bold, wide] = payload.t.map((n) => Math.max(0, Math.trunc(n) || 0));
  const classified = locked + smooth + bold + wide;
  const [trackCount, keyedCount] = payload.n ?? [0, 0];
  if (trackCount <= 0) return null;

  const keyCoverage = Math.min(1, Math.max(0, keyedCount / trackCount));
  const hasEnoughKeys = keyCoverage >= MIN_KEY_COVERAGE;
  const usable = hasEnoughKeys && classified > 0;

  const keyTimeShare: Record<number, number> = {};
  const keyTimeShareByKey: Record<string, number> = {};
  for (let n = 1; n <= 12; n++) {
    keyTimeShare[n] = 0;
    keyTimeShareByKey[`${n}A`] = 0;
    keyTimeShareByKey[`${n}B`] = 0;
  }
  for (const [key, perMille] of Object.entries(payload.k)) {
    const match = /^(\d{1,2})([AB])$/.exec(key);
    if (!match) continue;
    const number = Number(match[1]);
    if (number < 1 || number > 12) continue;
    const share = Math.min(1, Math.max(0, perMille / 1000));
    keyTimeShare[number] += share;
    keyTimeShareByKey[key] += share;
  }

  const bpm = payload.b
    ? {
        min: payload.b[1],
        max: payload.b[2],
        mean: payload.b[0],
        median: payload.b[0],
        p10: payload.b[1],
        p90: payload.b[2],
        spread: Math.max(0, payload.b[2] - payload.b[1]),
      }
    : null;

  const distinctKeys = Object.keys(payload.k).length;
  const rangeParts: number[] = [];
  if (bpm) rangeParts.push(Math.min(1, bpm.spread / 30));
  if (hasEnoughKeys) rangeParts.push(Math.min(1, distinctKeys / 8));

  return {
    trackCount,
    keyCoverage,
    harmonic: usable ? (locked + smooth) / classified : null,
    risk: usable ? (bold + wide) / classified : null,
    range: rangeParts.length ? rangeParts.reduce((s, v) => s + v, 0) / rangeParts.length : null,
    climb: payload.c ? payload.c[0] / 100 : null,
    components: {
      transitions: { locked, smooth, bold, wide, classified },
      boldShare: usable ? bold / classified : null,
      wideShare: usable ? wide / classified : null,
      bpm,
      distinctKeys,
      keyTimeShare,
      keyTimeShareByKey,
      keySegments: [],
      peakPosition: payload.c ? payload.c[1] / 100 : null,
      shape: payload.s && SHAPES.includes(payload.s) ? payload.s : null,
    },
  };
}
