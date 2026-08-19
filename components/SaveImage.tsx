'use client';

import { useState } from 'react';
import { trackSaveImage } from '@/lib/analytics';
import { renderShareImage, type ShareImageFormat } from '@/lib/ui/shareImage';
import { resolveArchetype } from '@/lib/metrics/archetype';
import type { Vitals } from '@/lib/metrics/vitals';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Deferred: revoking immediately can cut off the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * A picture to post, not a page to link to — for Stories, or a feed square.
 * Rendered client-side from the same rings and readings already on screen, so
 * this needs nothing from the server and works on a set that was never saved.
 */
export function SaveImage({ vitals, meta }: { vitals: Vitals; meta?: string }) {
  const [pending, setPending] = useState<ShareImageFormat | null>(null);

  async function save(format: ShareImageFormat) {
    setPending(format);
    try {
      const blob = await renderShareImage(vitals, format, meta);
      trackSaveImage({ format });
      download(blob, `saber-${resolveArchetype(vitals).id}-${format}.png`);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      <button
        type="button"
        onClick={() => save('story')}
        disabled={pending !== null}
        className="label border border-line px-4 py-2 hover:border-text hover:text-text disabled:opacity-50"
      >
        {pending === 'story' ? 'Rendering' : 'Save for Stories'}
      </button>
      <button
        type="button"
        onClick={() => save('square')}
        disabled={pending !== null}
        className="label border border-line px-4 py-2 hover:border-text hover:text-text disabled:opacity-50"
      >
        {pending === 'square' ? 'Rendering' : 'Save square'}
      </button>
    </div>
  );
}
