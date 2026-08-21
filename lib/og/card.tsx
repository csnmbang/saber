import { resolveArchetype, type Archetype } from '@/lib/metrics/archetype';
import { antonFont, spaceMonoFont } from '@/lib/og/fonts';
import { ringsDataUri } from '@/lib/ui/ringsSvg';
import type { Vitals } from '@/lib/metrics/vitals';

export const OG_SIZE = { width: 1200, height: 630 };
const BOX = 500;
const CREAM = '#EDE7DB';
const MUTED = '#8A8A8F';

/**
 * The card element and its fonts, shared by every route that renders one — a
 * share link's code, an example's permalink, anything later. One place to keep
 * the card looking the same wherever a reading is shared from.
 */
export async function vitalsCard(vitals: Vitals, kicker: string, metaLine?: string) {
  const archetype: Archetype = resolveArchetype(vitals);
  const { bpm } = vitals.components;
  const meta = metaLine ?? `${vitals.trackCount} TRACKS${bpm ? ` · ${bpm.mean.toFixed(0)} BPM` : ''}`;

  const readings: [string, string][] = [
    ['HARMONIC', vitals.harmonic === null ? '—' : `${Math.round(vitals.harmonic * 100)}%`],
    ['RISK', vitals.risk === null ? '—' : `${Math.round(vitals.risk * 100)}%`],
    ['RANGE', vitals.range === null ? '—' : `${Math.round(vitals.range * 100)}%`],
    ['CLIMB', vitals.climb === null ? '—' : vitals.climb.toFixed(2)],
  ];

  const [anton, mono] = await Promise.all([antonFont(), spaceMonoFont()]);

  const element = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: '#0B0B0C',
        color: CREAM,
        padding: 64,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: 20, letterSpacing: 6, color: MUTED }}>
          {kicker}
        </div>
        <div
          style={{
            fontFamily: 'Anton',
            fontSize: 76,
            textTransform: 'uppercase',
            marginTop: 18,
            lineHeight: 1,
          }}
        >
          {archetype.name}
        </div>
        <div
          style={{
            fontFamily: 'Space Mono',
            fontSize: 22,
            color: MUTED,
            marginTop: 18,
            maxWidth: 460,
            lineHeight: 1.4,
          }}
        >
          {archetype.blurb}
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 44 }}>
          {readings.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'Space Mono', fontSize: 15, letterSpacing: 3, color: MUTED }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 34, marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'Space Mono',
            fontSize: 17,
            letterSpacing: 3,
            color: MUTED,
            marginTop: 40,
          }}
        >
          {meta}
        </div>
      </div>

      <img src={ringsDataUri(vitals)} width={BOX} height={BOX} alt="" />
    </div>
  );

  const fonts = [
    { name: 'Anton', data: anton, weight: 400 as const },
    { name: 'Space Mono', data: mono, weight: 400 as const },
  ];

  return { element, fonts };
}

export async function wordmarkCard() {
  const anton = await antonFont();
  const element = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0B0C',
        color: CREAM,
        fontFamily: 'Anton',
        fontSize: 96,
        textTransform: 'uppercase',
      }}
    >
      Saber
    </div>
  );
  return { element, fonts: [{ name: 'Anton', data: anton, weight: 400 as const }] };
}
