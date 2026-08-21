'use client';

import { useState } from 'react';
import Link from 'next/link';
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

import { EXAMPLES, formatPlayed } from '@/lib/examples';

type Analysis = { parsed: ParseResult; vitals: Vitals };

export function SetReader({ canSave }: { canSave: boolean }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: not fetched yet. null: fetched, nothing to show (no chart data,
  // or the request failed) — either way the reading just doesn't render.
  const [beatport, setBeatport] = useState<BeatportScore | null | undefined>(undefined);

  async function handleFile(file: File) {
    setError(null);
    setBeatport(undefined);
    try {
      const parsed = parseRekordboxTxt(await file.arrayBuffer());
      if (parsed.tracks.length === 0) {
        setError(parsed.warnings[0] ?? 'No tracks in that file.');
        setAnalysis(null);
        return;
      }
      setAnalysis({ parsed, vitals: computeVitals(parsed.tracks) });
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
                  <Link
                    href={`/example/${example.id}`}
                    className="group block w-full py-3"
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-x-6">
                      {/* Whose set it is carries the line. A three-name credit
                          run into the set title reads as a fourth artist. */}
                      <span className="text-muted group-hover:text-text transition-colors">
                        {example.artist}
                      </span>
                      <span className="label shrink-0">{formatPlayed(example.playedAt)}</span>
                    </span>
                    <span className="block text-[13px] text-muted/70 mt-0.5">{example.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted mt-3">
              Published tracklists. Tempo and key for each track come from Beatport.
            </p>
          </section>
        </>
      )}

      {analysis && (
        <>
          <SetSummary
            vitals={analysis.vitals}
            meta={`${analysis.parsed.tracks.length} tracks · ${analysis.parsed.source}`}
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
