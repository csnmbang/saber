import { ImageResponse } from 'next/og';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { decodeShare } from '@/lib/share';
import { ringsDataUri } from '@/lib/ui/ringsSvg';

export const alt = 'A set read by Saber';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BOX = 500;

/**
 * The card is the flat rings, the same SVG the result page draws, so a set
 * looks the same in a timeline as it does on the site. No WebGL, so links
 * unfurl fast.
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vitals = decodeShare(code);

  if (!vitals) {
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
            color: '#EDE7DB',
            fontSize: 64,
            letterSpacing: 4,
          }}
        >
          SABER
        </div>
      ),
      size,
    );
  }

  const archetype = resolveArchetype(vitals);
  const { bpm } = vitals.components;

  // Satori wants one child per element, so anything interpolated is joined here.
  const meta = `${vitals.trackCount} TRACKS${bpm ? ` \u00b7 ${bpm.mean.toFixed(0)} BPM` : ''}`;

  const readings: [string, string][] = [
    ['HARMONIC', vitals.harmonic === null ? '—' : `${Math.round(vitals.harmonic * 100)}%`],
    ['RISK', vitals.risk === null ? '—' : `${Math.round(vitals.risk * 100)}%`],
    ['RANGE', vitals.range === null ? '—' : `${Math.round(vitals.range * 100)}%`],
    ['CLIMB', vitals.climb === null ? '—' : vitals.climb.toFixed(2)],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#0B0B0C',
          color: '#EDE7DB',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 20, letterSpacing: 6, color: '#8A8A8F' }}>SABER</div>
          <div style={{ fontSize: 76, letterSpacing: 1, marginTop: 18, lineHeight: 1 }}>
            {archetype.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 24, color: '#8A8A8F', marginTop: 18, maxWidth: 460 }}>
            {archetype.blurb}
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 44 }}>
            {readings.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15, letterSpacing: 3, color: '#8A8A8F' }}>{label}</div>
                <div style={{ fontSize: 34, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 17, letterSpacing: 3, color: '#8A8A8F', marginTop: 40 }}>
            {meta}
          </div>
        </div>

        <img src={ringsDataUri(vitals)} width={BOX} height={BOX} alt="" />
      </div>
    ),
    size,
  );
}
