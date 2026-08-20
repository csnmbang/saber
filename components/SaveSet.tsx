'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackSaveSet } from '@/lib/analytics';
import type { ParsedTrack, ParseSource } from '@/lib/parse/types';

/**
 * Offered after the reading, never before it. The result is never gated behind
 * saving, so this is one more thing you can do, not a step you have to take.
 */
export function SaveSet({ tracks, source }: { tracks: ParsedTrack[]; source: ParseSource }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');

  async function save() {
    setState('saving');
    try {
      const response = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source, tracks }),
      });
      if (!response.ok) {
        setState('failed');
        return;
      }
      const { id } = await response.json();
      trackSaveSet({ source });
      router.push(`/set/${id}`);
    } catch {
      setState('failed');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={save}
        disabled={state === 'saving'}
        className="btn-quiet"
      >
        {state === 'saving' ? 'Saving' : 'Save to my profile'}
      </button>
      <p className="label mt-3">
        {state === 'failed'
          ? 'That did not save. Try again.'
          : 'Kept on this device. No signup.'}
      </p>
    </div>
  );
}
