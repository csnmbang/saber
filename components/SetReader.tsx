'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { SaveSet } from '@/components/SaveSet';
import { SetSummary } from '@/components/SetSummary';
import { ShareLink } from '@/components/ShareLink';
import { Tracklist } from '@/components/Tracklist';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import type { ParseResult } from '@/lib/parse/types';
import { computeVitals, type Vitals } from '@/lib/metrics/vitals';

type Analysis = { parsed: ParseResult; vitals: Vitals };

export function SetReader({ canSave }: { canSave: boolean }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = parseRekordboxTxt(await file.arrayBuffer());
      if (parsed.tracks.length === 0) {
        setError(parsed.warnings[0] ?? 'No tracks in that file.');
        setAnalysis(null);
        return;
      }
      setAnalysis({ parsed, vitals: computeVitals(parsed.tracks) });
    } catch {
      setError('That file would not read. Export it again from rekordbox as a .txt.');
      setAnalysis(null);
    }
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        {/* The wordmark doubles as the way back to the drop zone. */}
        <button
          type="button"
          onClick={() => setAnalysis(null)}
          className="display text-6xl cursor-pointer"
          aria-label={analysis ? 'Read another set' : 'Saber'}
        >
          Saber
        </button>
        <p className="text-muted mt-2">Drop your track list. See what you played.</p>
      </header>

      {!analysis && (
        <>
          <DropZone onFile={handleFile} />
          {error && <p className="text-[13px]">{error}</p>}
        </>
      )}

      {analysis && (
        <>
          <SetSummary
            vitals={analysis.vitals}
            meta={`${analysis.parsed.tracks.length} tracks · ${analysis.parsed.source}`}
          />

          {!analysis.parsed.hasEnoughKeys && (
            <section className="border border-line bg-surface p-5">
              <p className="label">No key data</p>
              <p className="mt-2 text-[13px]">
                {Math.round(analysis.parsed.keyCoverage * 100)}% of these tracks have a key, so the
                harmonic readings are blank rather than guessed. Tempo and structure below still
                hold.
              </p>
              <p className="mt-2 text-[13px] text-muted">
                Select the tracks in rekordbox, right-click, Analyze. Then export again.
              </p>
            </section>
          )}

          <Tracklist tracks={analysis.parsed.tracks} />
          <div className="flex flex-wrap gap-10">
            <ShareLink vitals={analysis.vitals} />
            {canSave && <SaveSet tracks={analysis.parsed.tracks} source={analysis.parsed.source} />}
          </div>
        </>
      )}
    </main>
  );
}
