import { ImageResponse } from 'next/og';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { decodeShare } from '@/lib/share';
import { antonFont, spaceMonoFont } from '@/lib/og/fonts';
import { ringsDataUri } from '@/lib/ui/ringsSvg';

export const alt = 'A set read by Saber';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BOX = 500;
const CREAM = '#EDE7DB';
const MUTED = '#8A8A8F';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vitals = decodeShare(code);

  if (!vitals) {
    const anton = await antonFont();
    return new ImageResponse(
      (
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
      ),
      { ...size, fonts: [{ name: 'Anton', data: anton, weight: 400 }] },
    );
  }

  const archetype = resolveArchetype(vitals);
  const { bpm } = vitals.components;

  // Satori wants one child per element, so anything interpolated is joined here.
  const meta = `${vitals.trackCount} TRACKS${bpm ? ` · ${bpm.mean.toFixed(0)} BPM` : ''}`;

  const readings: [string, string][] = [
    ['HARMONIC', vitals.harmonic === null ? '—' : `${Math.round(vitals.harmonic * 100)}%`],
    ['RISK', vitals.risk === null ? '—' : `${Math.round(vitals.risk * 100)}%`],
    ['RANGE', vitals.range === null ? '—' : `${Math.round(vitals.range * 100)}%`],
    ['CLIMB', vitals.climb === null ? '—' : vitals.climb.toFixed(2)],
  ];

  const [anton, mono] = await Promise.all([antonFont(), spaceMonoFont()]);

  return new ImageResponse(
    (
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
            SABER
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
    ),
    {
      ...size,
      fonts: [
        { name: 'Anton', data: anton, weight: 400 },
        { name: 'Space Mono', data: mono, weight: 400 },
      ],
    },
  );
}
