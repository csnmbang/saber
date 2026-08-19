'use client';

import { useState } from 'react';
import { encodeShare } from '@/lib/share';
import type { Vitals } from '@/lib/metrics/vitals';

/**
 * Publishing is explicit and it is the last thing offered, never a gate in
 * front of the result. The link carries the readings only, so what becomes
 * visible is stated plainly and is exactly what the button says it is.
 */
export function ShareLink({ vitals }: { vitals: Vitals }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/s/${encodeShare(vitals)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy your link', url);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="label border border-line px-4 py-2 hover:border-text hover:text-text"
      >
        {copied ? 'Link copied' : 'Copy share link'}
      </button>
      <p className="label mt-3">Shares the readings and the rings. Not your tracklist.</p>
    </div>
  );
}
