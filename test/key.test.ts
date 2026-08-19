import { describe, expect, it } from 'vitest';
import { camelotHue, parseCamelot, toCamelot, wheelDistance, wheelStepsForward } from '@/lib/parse/key';

describe('toCamelot', () => {
  it('passes Camelot through, normalized', () => {
    expect(toCamelot('8A')).toBe('8A');
    expect(toCamelot('12b')).toBe('12B');
    expect(toCamelot(' 1 A ')).toBe('1A');
  });

  it('rejects out-of-range Camelot', () => {
    expect(toCamelot('13A')).toBeNull();
    expect(toCamelot('0B')).toBeNull();
  });

  it('converts Open Key', () => {
    expect(toCamelot('1m')).toBe('8A'); // A minor
    expect(toCamelot('1d')).toBe('8B'); // C major
    expect(toCamelot('2d')).toBe('9B'); // G major
    expect(toCamelot('12d')).toBe('7B'); // F major
    expect(toCamelot('6m')).toBe('1A');
  });

  it('converts classical notation', () => {
    expect(toCamelot('Am')).toBe('8A');
    expect(toCamelot('C')).toBe('8B');
    expect(toCamelot('F#m')).toBe('11A');
    expect(toCamelot('Gbm')).toBe('11A');
    expect(toCamelot('Bb')).toBe('6B');
    expect(toCamelot('D min')).toBe('7A');
    expect(toCamelot('Ebmaj')).toBe('5B');
  });

  it('handles unicode accidentals', () => {
    expect(toCamelot('B♭')).toBe('6B');
    expect(toCamelot('F♯m')).toBe('11A');
  });

  it('returns null rather than guessing', () => {
    expect(toCamelot('')).toBeNull();
    expect(toCamelot(null)).toBeNull();
    expect(toCamelot('unknown')).toBeNull();
    expect(toCamelot('H')).toBeNull();
    expect(toCamelot('Amish')).toBeNull();
  });

  it('round-trips every Camelot key through classical notation', () => {
    const classical = [
      ['1A', 'G#m'], ['2A', 'D#m'], ['3A', 'A#m'], ['4A', 'Fm'],
      ['5A', 'Cm'], ['6A', 'Gm'], ['7A', 'Dm'], ['8A', 'Am'],
      ['9A', 'Em'], ['10A', 'Bm'], ['11A', 'F#m'], ['12A', 'C#m'],
      ['1B', 'B'], ['2B', 'F#'], ['3B', 'C#'], ['4B', 'G#'],
      ['5B', 'D#'], ['6B', 'A#'], ['7B', 'F'], ['8B', 'C'],
      ['9B', 'G'], ['10B', 'D'], ['11B', 'A'], ['12B', 'E'],
    ];
    for (const [camelot, name] of classical) expect(toCamelot(name)).toBe(camelot);
  });
});

describe('wheel arithmetic', () => {
  it('wraps at 12', () => {
    expect(wheelDistance(12, 1)).toBe(1);
    expect(wheelDistance(1, 12)).toBe(1);
    expect(wheelDistance(1, 7)).toBe(6);
    expect(wheelStepsForward(12, 7)).toBe(7);
    expect(wheelStepsForward(7, 12)).toBe(5);
  });

  it('spaces hues evenly around the wheel', () => {
    expect(camelotHue(1)).toBe(0);
    expect(camelotHue(5)).toBe(120);
    expect(camelotHue(12)).toBe(330);
  });
});

describe('parseCamelot', () => {
  it('splits into number and letter', () => {
    expect(parseCamelot('11A')).toEqual({ number: 11, letter: 'A' });
    expect(parseCamelot('bogus')).toBeNull();
    expect(parseCamelot(null)).toBeNull();
  });
});
