import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import type { ParsedTrack } from '@/lib/parse/types';
import { classifyTransition, transitionsOf } from '@/lib/metrics/transitions';
import { computeVitals, spearman } from '@/lib/metrics/vitals';
import { resolveArchetype } from '@/lib/metrics/archetype';

/** Build a tracklist from [bpm, camelot] pairs. */
function makeSet(rows: [number | null, string | null][]): ParsedTrack[] {
  return rows.map(([bpm, camelot], i) => ({
    position: i + 1,
    title: `Track ${i + 1}`,
    artist: 'Someone',
    bpm,
    camelot,
    durationS: 360,
    genre: null,
  }));
}

describe('classifyTransition', () => {
  it('calls an identical key locked', () => {
    expect(classifyTransition('8A', '8A')).toBe('locked');
  });

  it('calls a neighbour on the same ring smooth, wrapping at 12', () => {
    expect(classifyTransition('8A', '9A')).toBe('smooth');
    expect(classifyTransition('8A', '7A')).toBe('smooth');
    expect(classifyTransition('12A', '1A')).toBe('smooth');
    expect(classifyTransition('1B', '12B')).toBe('smooth');
  });

  it('calls the relative major/minor smooth', () => {
    expect(classifyTransition('8A', '8B')).toBe('smooth');
    expect(classifyTransition('3B', '3A')).toBe('smooth');
  });

  it('calls the dominant lift and the two-step bold', () => {
    expect(classifyTransition('8A', '3A')).toBe('bold'); // +7
    expect(classifyTransition('10B', '5B')).toBe('bold'); // +7, wrapped
    expect(classifyTransition('8A', '10A')).toBe('bold'); // +2
    expect(classifyTransition('8A', '6A')).toBe('bold'); // -2
  });

  it('is directional about the dominant', () => {
    // -7 is not the same move as +7; it is five back, which is wide.
    expect(classifyTransition('3A', '8A')).toBe('wide');
  });

  it('calls everything else wide', () => {
    expect(classifyTransition('8A', '2B')).toBe('wide');
    expect(classifyTransition('1A', '6B')).toBe('wide');
  });

  it('returns null when a key cannot be read', () => {
    expect(classifyTransition('8A', 'nope')).toBeNull();
  });
});

describe('transitionsOf', () => {
  it('drops pairs with an unknown key instead of counting them as failures', () => {
    const tracks = makeSet([
      [124, '8A'],
      [124, null],
      [124, '9A'],
      [124, '9A'],
    ]);
    const transitions = transitionsOf(tracks);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ from: 3, to: 4, kind: 'locked' });
  });
});

describe('computeVitals', () => {
  it('reports harmonic and risk as complementary shares of the same transitions', () => {
    const vitals = computeVitals(
      makeSet([
        [124, '8A'],
        [124, '9A'], // smooth
        [124, '9A'], // locked
        [124, '2B'], // wide
      ]),
    );
    expect(vitals.components.transitions).toMatchObject({
      locked: 1,
      smooth: 1,
      bold: 0,
      wide: 1,
      classified: 3,
    });
    expect(vitals.harmonic).toBeCloseTo(2 / 3);
    expect(vitals.risk).toBeCloseTo(1 / 3);
    expect(vitals.harmonic! + vitals.risk!).toBe(1);
  });

  it('withholds harmonic readings when key coverage is under 60%', () => {
    const vitals = computeVitals(
      makeSet([
        [120, '8A'],
        [122, '9A'],
        [124, null],
        [126, null],
        [128, null],
      ]),
    );
    expect(vitals.keyCoverage).toBeCloseTo(0.4);
    expect(vitals.harmonic).toBeNull();
    expect(vitals.risk).toBeNull();
    // The BPM half still reports.
    expect(vitals.climb).not.toBeNull();
    expect(vitals.components.bpm?.spread).toBeGreaterThan(0);
  });

  it('reads a rising set as a positive climb and a falling set as negative', () => {
    const up = computeVitals(makeSet([[120, '8A'], [124, '8A'], [128, '8A'], [132, '8A']]));
    const down = computeVitals(makeSet([[132, '8A'], [128, '8A'], [124, '8A'], [120, '8A']]));
    expect(up.climb).toBeCloseTo(1);
    expect(down.climb).toBeCloseTo(-1);
    expect(up.components.peakPosition).toBe(1);
    expect(down.components.peakPosition).toBe(0);
  });

  it('weights the ring shares by time spent in each key', () => {
    const tracks = makeSet([[124, '8A'], [124, '9A']]);
    tracks[0].durationS = 300;
    tracks[1].durationS = 100;
    const vitals = computeVitals(tracks);
    expect(vitals.components.keyTimeShare[8]).toBeCloseTo(0.75);
    expect(vitals.components.keyTimeShare[9]).toBeCloseTo(0.25);
    expect(vitals.components.keyTimeShare[1]).toBe(0);
  });

  it('survives a set with no usable data at all', () => {
    const vitals = computeVitals([]);
    expect(vitals.harmonic).toBeNull();
    expect(vitals.range).toBeNull();
    expect(vitals.climb).toBeNull();
    expect(vitals.components.shape).toBeNull();
  });

  it('calls a set that never changed tempo a plateau', () => {
    const vitals = computeVitals(makeSet([[124, '8A'], [124, '9A'], [124, '9A'], [124, '10A']]));
    expect(vitals.components.shape).toBe('plateau');
  });
});

describe('average tempo', () => {
  it('reports the mean BPM the rings turn at', () => {
    const vitals = computeVitals(makeSet([[120, '8A'], [124, '8A'], [128, '8A'], [132, '8A']]));
    expect(vitals.components.bpm?.mean).toBe(126);
  });

  it('has no mean to report when nothing carried a tempo', () => {
    const vitals = computeVitals(makeSet([[null, '8A'], [null, '9A']]));
    expect(vitals.components.bpm).toBeNull();
  });
});

describe('spearman', () => {
  it('handles ties without dividing by zero', () => {
    expect(spearman([1, 2, 3, 4], [120, 120, 120, 120])).toBeNull();
    expect(spearman([1, 2, 3, 4], [120, 120, 124, 128])).toBeGreaterThan(0);
  });
});

describe('resolveArchetype', () => {
  it('is deterministic for the same set', () => {
    const tracks = makeSet([[120, '8A'], [124, '9A'], [128, '10A'], [132, '10A']]);
    expect(resolveArchetype(computeVitals(tracks)).id).toBe(
      resolveArchetype(computeVitals(tracks)).id,
    );
  });

  it('names a tightly keyed, steadily rising set the Architect', () => {
    const vitals = computeVitals(
      makeSet([[120, '8A'], [123, '9A'], [126, '9A'], [129, '10A'], [132, '10B']]),
    );
    const archetype = resolveArchetype(vitals);
    expect(archetype.id).toBe('architect');
    expect(archetype.drivers).toEqual(['harmonic', 'climb']);
  });

  it('names a bold-but-in-key set the Tightrope', () => {
    const vitals = computeVitals(
      makeSet([[124, '8A'], [124, '3A'], [124, '10A'], [124, '5A'], [124, '5A']]),
    );
    expect(vitals.components.boldShare).toBeGreaterThan(0.25);
    expect(vitals.components.wideShare).toBe(0);
    expect(resolveArchetype(vitals).id).toBe('tightrope');
  });

  it('names an early-peaking set the Sprinter', () => {
    const vitals = computeVitals(
      makeSet([[128, '8A'], [140, '2B'], [120, '5A'], [118, '11B'], [116, '4A'], [115, '7B']]),
    );
    expect(resolveArchetype(vitals).id).toBe('sprinter');
  });

  it('always returns a name, even for a set with no key data', () => {
    const vitals = computeVitals(makeSet([[120, null], [130, null], [125, null], [135, null]]));
    const archetype = resolveArchetype(vitals);
    expect(archetype.name).toBeTruthy();
    expect(archetype.blurb).toBeTruthy();
  });
});

describe('the real export end to end', () => {
  const parsed = parseRekordboxTxt(
    readFileSync(path.join(__dirname, 'fixtures/rekordbox/euro-problem.txt')),
  );
  const vitals = computeVitals(parsed.tracks);

  it('classifies every transition in a fully keyed set', () => {
    expect(vitals.components.transitions.classified).toBe(parsed.tracks.length - 1);
  });

  it('keeps every reading inside its own bounds', () => {
    expect(vitals.harmonic).toBeGreaterThanOrEqual(0);
    expect(vitals.harmonic).toBeLessThanOrEqual(1);
    expect(vitals.range).toBeGreaterThanOrEqual(0);
    expect(vitals.range).toBeLessThanOrEqual(1);
    expect(Math.abs(vitals.climb!)).toBeLessThanOrEqual(1);
    const ringTotal = Object.values(vitals.components.keyTimeShare).reduce((s, v) => s + v, 0);
    expect(ringTotal).toBeCloseTo(1);
  });

  it('resolves to a real archetype', () => {
    const archetype = resolveArchetype(vitals);
    expect(archetype.id).toBeTruthy();
    expect(archetype.drivers).toHaveLength(2);
  });
});
