import { describe, expect, it } from 'vitest';
import { NO_TEMPO_SPIN, platterAngle, screenAngle, spinFor } from '@/lib/ui/spin';

const TILT = -0.86;

/** Unwrap a sequence of angles so a wrap past π does not read as a reversal. */
function unwrap(angles: number[]): number[] {
  const out = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let a = angles[i];
    while (a - out[i - 1] > Math.PI) a -= Math.PI * 2;
    while (a - out[i - 1] < -Math.PI) a += Math.PI * 2;
    out.push(a);
  }
  return out;
}

describe('platter rotation', () => {
  it('turns at the set tempo, one revolution per sixteen beats', () => {
    // 124 BPM is 7.74 seconds a turn.
    expect((Math.PI * 2) / spinFor(124)).toBeCloseTo(7.74, 2);
    expect(spinFor(248)).toBeCloseTo(spinFor(124) * 2, 6);
  });

  it('falls back to a fixed rate when the export had no tempo', () => {
    expect(spinFor(null)).toBe(NO_TEMPO_SPIN);
    expect(spinFor(0)).toBe(NO_TEMPO_SPIN);
  });

  it('runs the platter angle negative', () => {
    expect(platterAngle(1, spinFor(124))).toBeLessThan(0);
  });

  it('carries a mark clockwise across the screen', () => {
    // Clockwise on screen is a decreasing counter-clockwise angle. Sample a
    // whole revolution so this cannot pass by catching one lucky instant.
    const spin = spinFor(124);
    const period = (Math.PI * 2) / spin;
    const samples = Array.from({ length: 41 }, (_, i) =>
      screenAngle(0, (i * period) / 40, spin, TILT),
    );
    const path = unwrap(samples);
    for (let i = 1; i < path.length; i++) {
      expect(path[i]).toBeLessThan(path[i - 1]);
    }
    // One period is exactly one turn. The tilt foreshortens the vertical axis,
    // so the screen angle does not advance evenly along the way — only the
    // total is fixed.
    expect(path[0] - path[path.length - 1]).toBeCloseTo(Math.PI * 2, 6);
  });

  it('holds direction for every mark on the rim, not just the first', () => {
    const spin = spinFor(124);
    for (let mark = 0; mark < 36; mark++) {
      const angle = (mark / 36) * Math.PI * 2;
      const path = unwrap([0, 0.4, 0.8].map((t) => screenAngle(angle, t, spin, TILT)));
      expect(path[1]).toBeLessThan(path[0]);
      expect(path[2]).toBeLessThan(path[1]);
    }
  });

  it('does not mirror while the tilt stays inside a quarter turn', () => {
    const spin = spinFor(124);
    for (const tilt of [0, -0.4, -0.86, -1.4]) {
      const path = unwrap([0, 0.3].map((t) => screenAngle(0.7, t, spin, tilt)));
      expect(path[1]).toBeLessThan(path[0]);
    }
  });
});
