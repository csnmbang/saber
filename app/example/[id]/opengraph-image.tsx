import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import { computeVitals } from '@/lib/metrics/vitals';
import { findExample, formatPlayed } from '@/lib/examples';
import { vitalsCard, wordmarkCard, OG_SIZE } from '@/lib/og/card';

export const alt = 'A set read by Saber';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = findExample(id);

  if (!example) {
    const { element, fonts } = await wordmarkCard();
    return new ImageResponse(element, { ...size, fonts });
  }

  const buf = await readFile(path.join(process.cwd(), 'public', 'demo', example.file));
  const vitals = computeVitals(parseRekordboxTxt(buf).tracks);
  // The kicker names whose set this is, so the card reads as theirs at a
  // glance rather than as a generic Saber card that happens to be about them.
  const { element, fonts } = await vitalsCard(
    vitals,
    example.artist.toUpperCase(),
    `${vitals.trackCount} TRACKS · ${formatPlayed(example.playedAt).toUpperCase()}`,
  );
  return new ImageResponse(element, { ...size, fonts });
}
