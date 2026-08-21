'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { dominantGenre, trackReadSet } from '@/lib/analytics';
import { SaveImage } from '@/components/SaveImage';
import { SaveSet } from '@/components/SaveSet';
import { SetSummary } from '@/components/SetSummary';
import { ShareLink } from '@/components/ShareLink';
import { Tracklist } from '@/components/Tracklist';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import type { ParseResult } from '@/lib/parse/types';
import { computeVitals, type Vitals } from '@/lib/metrics/vitals';
import type { BeatportScore } from '@/lib/beatport/match';

type Analysis = { parsed: ParseResult; vitals: Vitals; example?: Example };

/**
 * Sets anyone can look at without owning a rekordbox export. The drop zone
 * asks for a file before it shows anything, which is a lot to ask of someone
 * who does not yet know what this is.
 *
 * A list rather than one button, because there will be more of these. Each one
 * is a published tracklist with tempo and key looked up per track. Nobody
 * exported these from anything, and the copy under the list says so.
 * test/fixtures/rekordbox/README.md records exactly how they were built.
 */
type Example = {
  id: string;
  file: string;
  artist: string;
  name: string;
  playedAt: string;
};

const EXAMPLES: Example[] = [
  {
    id: 'asot-ibiza-2026',
    file: '/demo/asot-ibiza-2026.txt',
    artist: 'Armin van Buuren',
    name: 'A State Of Trance Ibiza 2026',
    playedAt: '2026-08-06',
  },
];

function formatPlayed(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SetReader({ canSave }: { canSave: boolean }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: not fetched yet. null: fetched, nothing to show (no chart data,
  // or the request failed) — either way the reading just doesn't render.
  const [beatport, setBeatport] = useState<BeatportScore | null | undefined>(undefined);

  async function handleFile(file: File, example?: Example) {
    setError(null);
    setBeatport(undefined);
    try {
      const parsed = parseRekordboxTxt(await file.arrayBuffer());
      if (parsed.tracks.length === 0) {
        setError(parsed.warnings[0] ?? 'No tracks in that file.');
        setAnalysis(null);
        return;
      }
      setAnalysis({ parsed, vitals: computeVitals(parsed.tracks), example });
      trackReadSet({
        source: parsed.source,
        trackCount: parsed.tracks.length,
        hasEnoughKeys: parsed.hasEnoughKeys,
        genre: dominantGenre(parsed.tracks),
      });

      // Fire and forget: this is a counter, and nothing on the page waits on it.
      fetch('/api/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: parsed.source,
          trackCount: parsed.tracks.length,
          hasEnoughKeys: parsed.hasEnoughKeys,
        }),
        keepalive: true,
      }).catch(() => {});

      fetch('/api/beatport-score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tracks: parsed.tracks }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((score: BeatportScore | null) => setBeatport(score))
        .catch(() => setBeatport(null));
    } catch {
      setError('That file would not read. Export it again from rekordbox as a .txt.');
      setAnalysis(null);
    }
  }

  async function loadExample(example: Example) {
    const response = await fetch(example.file);
    const blob = await response.blob();
    await handleFile(new File([blob], `${example.id}.txt`), example);
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
          <section>
            <p className="label">See an example</p>
            <ul className="mt-2">
              {EXAMPLES.map((example) => (
                <li key={example.id} className="border-t border-line last:border-b">
                  <button
                    type="button"
                    onClick={() => loadExample(example)}
                    className="w-full flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-left text-muted hover:text-text transition-colors"
                  >
                    <span>
                      {example.artist}, {example.name}
                    </span>
                    <span className="label shrink-0">{formatPlayed(example.playedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted mt-3">
              Published tracklists. Tempo and key for each track come from Beatport, so none of
              this came out of rekordbox.
            </p>
          </section>
        </>
      )}

      {analysis && (
        <>
          {analysis.example && (
            <div className="-mb-6">
              <p className="label">Example</p>
              <p className="mt-1">
                {analysis.example.artist}, {analysis.example.name}
              </p>
            </div>
          )}

          <SetSummary
            vitals={analysis.vitals}
            meta={
              analysis.example
                ? `${analysis.parsed.tracks.length} tracks · ${formatPlayed(analysis.example.playedAt)}`
                : `${analysis.parsed.tracks.length} tracks · ${analysis.parsed.source}`
            }
            beatport={beatport}
            tracks={analysis.parsed.tracks}
          />

          {!analysis.parsed.hasEnoughKeys && (
            <section className="border border-line bg-surface p-5">
              <p className="label">No key data</p>
              <p className="mt-2 text-[13px]">
                Only {Math.round(analysis.parsed.keyCoverage * 100)}% of these tracks carry a key.
                Harmonic and Risk are left blank rather than guessed. Range, Climb and the tempo
                curve still read normally.
              </p>
              <p className="mt-2 text-[13px] text-muted">
                To fix it: select the tracks in rekordbox, right-click, Analyze, then export again.
              </p>
            </section>
          )}

          <Tracklist tracks={analysis.parsed.tracks} />
          <SaveImage
            vitals={analysis.vitals}
            meta={`${analysis.parsed.tracks.length} tracks${
              analysis.vitals.components.bpm ? ` · ${analysis.vitals.components.bpm.mean.toFixed(0)} bpm` : ''
            }`}
            tracks={analysis.parsed.tracks}
          />
          <div className="flex flex-wrap gap-10">
            <ShareLink vitals={analysis.vitals} />
            {canSave && <SaveSet tracks={analysis.parsed.tracks} source={analysis.parsed.source} />}
          </div>
        </>
      )}
    </main>
  );
}
