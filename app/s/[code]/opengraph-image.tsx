import { ImageResponse } from 'next/og';
import { decodeShare } from '@/lib/share';
import { vitalsCard, wordmarkCard, OG_SIZE } from '@/lib/og/card';

export const alt = 'A set read by Saber';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vitals = decodeShare(code);

  const { element, fonts } = vitals ? await vitalsCard(vitals, 'SABER') : await wordmarkCard();
  return new ImageResponse(element, { ...size, fonts });
}
