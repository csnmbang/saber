import { createCanvas, registerFont } from 'canvas';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { layoutShareImage, type ShareImageFormat } from '@/lib/ui/shareImage';
import { archetypeById, type ArchetypeId } from '@/lib/metrics/archetype';
import type { Vitals } from '@/lib/metrics/vitals';

registerFont(path.join(__dirname, '../assets/fonts/Anton-Regular.ttf'), { family: 'Anton Test' });
registerFont(path.join(__dirname, '../assets/fonts/SpaceMono-Regular.ttf'), { family: 'Mono Test' });

const FONTS = { anton: 'Anton Test', mono: 'Mono Test' };

/** A minimal but real vitals object, so every archetype can be resolved and drawn. */
function vitalsFor(id: ArchetypeId): Vitals {
  const base = {
    trackCount: 12,
    keyCoverage: 1,
    harmonic: 0.5,
    risk: 0.5,
    range: 0.5,
    climb: 0,
    components: {
      transitions: { locked: 2, smooth: 4, bold: 3, wide: 2, classified: 11 },
      boldShare: 0.27,
      wideShare: 0.18,
      bpm: { min: 118, max: 128, mean: 123, median: 123, p10: 119, p90: 127, spread: 8 },
      distinctKeys: 6,
      keyTimeShare: {},
      genreShare: {},
    keyTimeShareByKey: {},
      keySegments: [],
      peakPosition: 0.4,
      shape: 'wave' as const,
    },
  };
  const overrides: Partial<Record<ArchetypeId, Partial<Vitals>>> = {
    architect: { harmonic: 0.75, climb: 0.5 },
    gambler: { risk: 0.7, range: 0.8 },
    sprinter: { components: { ...base.components, peakPosition: 0.1 } },
    marathon: { climb: 0.5, components: { ...base.components, peakPosition: 0.85 } },
    tightrope: { components: { ...base.components, boldShare: 0.4, wideShare: 0.05 } },
    wanderer: { range: 0.8, climb: 0.02 },
    anchor: { harmonic: 0.75, range: 0.15, climb: 0.02 },
  };
  return { ...base, ...overrides[id] } as Vitals;
}

const ALL_ARCHETYPES: ArchetypeId[] = [
  'architect',
  'gambler',
  'sprinter',
  'marathon',
  'tightrope',
  'wanderer',
  'anchor',
];
const FORMATS: ShareImageFormat[] = ['story', 'square'];

describe('share image layout', () => {
  for (const format of FORMATS) {
    for (const id of ALL_ARCHETYPES) {
      it(`fits every block on the canvas — ${format}, ${id}`, () => {
        const canvas = createCanvas(1080, format === 'story' ? 1920 : 1080);
        const ctx = canvas.getContext('2d');
        const layout = layoutShareImage(ctx as never, vitalsFor(id), format, FONTS);

        expect(layout.fits).toBe(true);
        // Nothing drawn left of the padding or past the right edge.
        expect(layout.ringsX).toBeGreaterThanOrEqual(0);
        expect(layout.ringsX + layout.ringsSize).toBeLessThanOrEqual(layout.W);
        expect(layout.statX + layout.statColumnGap).toBeLessThanOrEqual(layout.W - layout.pad);
      });
    }
  }

  it('advances y from the real line count, not an assumption', () => {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');
    const short = layoutShareImage(ctx as never, vitalsFor('gambler'), 'square', FONTS);
    // Architect has the longest blurb of the seven and may wrap to a second
    // line at square's width — whichever it does, the rings still have to
    // start after the last blurb baseline, not before it.
    const long = layoutShareImage(ctx as never, vitalsFor('architect'), 'square', FONTS);
    expect(long.blurbLines.length).toBeGreaterThanOrEqual(short.blurbLines.length);
    const lastBlurbBaseline = (l: typeof short) => l.blurbBaselines[l.blurbBaselines.length - 1];
    expect(long.ringsY).toBeGreaterThan(lastBlurbBaseline(long));
    expect(long.fits).toBe(true);
  });
});
