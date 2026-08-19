/**
 * Key normalization. Everything in Saber speaks Camelot internally; exports
 * arrive in Camelot ('8A'), Open Key ('1m'), or classical ('Am', 'F#m', 'Db').
 */

export type Camelot = { number: number; letter: 'A' | 'B' };

/** Camelot wheel: '8B' -> C major, '8A' -> A minor. */
const CLASSICAL_TO_CAMELOT: Record<string, string> = {
  // Major (B ring), circle of fifths starting at C = 8B
  C: '8B', G: '9B', D: '10B', A: '11B', E: '12B', B: '1B',
  'F#': '2B', Gb: '2B', Db: '3B', 'C#': '3B', Ab: '4B', 'G#': '4B',
  Eb: '5B', 'D#': '5B', Bb: '6B', 'A#': '6B', F: '7B',
  // Minor (A ring), relative minors of the above
  Am: '8A', Em: '9A', Bm: '10A', 'F#m': '11A', Gbm: '11A',
  'C#m': '12A', Dbm: '12A', 'G#m': '1A', Abm: '1A',
  'D#m': '2A', Ebm: '2A', 'A#m': '3A', Bbm: '3A',
  Fm: '4A', Cm: '5A', Gm: '6A', Dm: '7A',
};

/** Strip accidental glyphs and whitespace rekordbox exports sometimes carry. */
function tidy(raw: string): string {
  return raw
    .replace(/♭/g, 'b')  // ♭
    .replace(/♯/g, '#')  // ♯
    .replace(/−/g, '-')  // −
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Parse any supported key notation into Camelot. Returns null for anything we
 * cannot resolve with certainty — an unrecognized key is missing data, never a
 * guess.
 */
export function toCamelot(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = tidy(raw);
  if (!s) return null;

  // Camelot: 1A-12B
  const camelot = /^(\d{1,2})([AB])$/i.exec(s);
  if (camelot) {
    const n = Number(camelot[1]);
    if (n >= 1 && n <= 12) return `${n}${camelot[2].toUpperCase()}`;
    return null;
  }

  // Open Key: 1m-12d. Open Key 1m = A minor = Camelot 8A, so n -> n + 7 (wrapped).
  const openKey = /^(\d{1,2})([md])$/i.exec(s);
  if (openKey) {
    const n = Number(openKey[1]);
    if (n < 1 || n > 12) return null;
    const number = ((n + 6) % 12) + 1;
    return `${number}${openKey[2].toLowerCase() === 'd' ? 'B' : 'A'}`;
  }

  // Classical: A, Am, F#m, Bbmaj, C min, Dmin ...
  const classical = /^([A-G])([#b]?)(.*)$/i.exec(s);
  if (classical) {
    const note = classical[1].toUpperCase() + classical[2].toLowerCase();
    const quality = classical[3].toLowerCase();
    let suffix: string;
    if (quality === '' || quality === 'maj' || quality === 'major' || quality === 'dur') {
      suffix = '';
    } else if (quality === 'm' || quality === 'min' || quality === 'minor' || quality === 'moll') {
      suffix = 'm';
    } else {
      return null;
    }
    return CLASSICAL_TO_CAMELOT[note + suffix] ?? null;
  }

  return null;
}

export function parseCamelot(camelot: string | null | undefined): Camelot | null {
  if (!camelot) return null;
  const m = /^(\d{1,2})([AB])$/.exec(camelot);
  if (!m) return null;
  const number = Number(m[1]);
  if (number < 1 || number > 12) return null;
  return { number, letter: m[2] as 'A' | 'B' };
}

/** Shortest distance around the 12-spoke wheel, 0-6. */
export function wheelDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

/** Signed steps clockwise from a to b, 0-11. */
export function wheelStepsForward(a: number, b: number): number {
  return ((b - a) % 12 + 12) % 12;
}

/** Hue for a Camelot number. The wheel is the palette: hue = (n - 1) * 30. */
export function camelotHue(number: number): number {
  return ((number - 1) * 30) % 360;
}
