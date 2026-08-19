import { describe, expect, it } from 'vitest';
import { ringSplit, showsTwoColors } from '@/lib/ui/ringSplit';

describe('ringSplit', () => {
  it('shows two colors only when a key was played in both minor and major', () => {
    for (const aShare of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      const split = ringSplit(aShare);
      expect(showsTwoColors(split)).toBe(true);
      expect(split.firstLetter).toBe('A');
      expect(split.secondLetter).toBe('B');
    }
  });

  it('is one color when the key was only ever minor', () => {
    const split = ringSplit(1);
    expect(showsTwoColors(split)).toBe(false);
    expect(split.firstLetter).toBe('A');
    expect(split.secondLetter).toBe('A');
  });

  it('is one color when the key was only ever major', () => {
    const split = ringSplit(0);
    expect(showsTwoColors(split)).toBe(false);
    expect(split.firstLetter).toBe('B');
    expect(split.secondLetter).toBe('B');
  });

  it('still cuts a single-color ring, so it can be seen turning', () => {
    // The cut exists regardless — that is what makes rotation legible — but on
    // a single-letter ring it must not imply a second key was played.
    expect(ringSplit(1).splitAt).toBe(0.5);
    expect(ringSplit(0).splitAt).toBe(0.5);
  });

  it('puts the cut on the real minor/major boundary when both were played', () => {
    expect(ringSplit(0.25).splitAt).toBe(0.25);
    expect(ringSplit(0.8).splitAt).toBe(0.8);
  });
});
