'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { HarmonicRings } from '@/components/HarmonicRings';
import { Tracklist } from '@/components/Tracklist';
import { VitalsPanel } from '@/components/VitalsPanel';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import type { ParseResult } from '@/lib/parse/types';
import { computeVitals, type Vitals } from '@/lib/metrics/vitals';
import { resolveArchetype, type Archetype } from '@/lib/metrics/archetype';

type Analysis = { parsed: ParseResult; vitals: Vitals; archetype: Archetype };

const READING_LABEL: Record<string, string> = {
  harmonic: 'Harmonic',
  risk: 'Risk',
  range: 'Range',
  climb: 'Climb',
};

function readingValue(vitals: Vitals, key: string): string {
  if (key === 'climb') return vitals.climb === null ? '—' : vitals.climb.toFixed(2);
  const v = vitals[key as 'harmonic' | 'risk' | 'range'];
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

export default function Home() {
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
      const vitals = computeVitals(parsed.tracks);
      setAnalysis({ parsed, vitals, archetype: resolveArchetype(vitals) });
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
          <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            <div>
              <p className="label">Archetype</p>
              <h2 className="display text-6xl mt-1">{analysis.archetype.name}</h2>
              <p className="mt-3 max-w-md">{analysis.archetype.blurb}</p>
              <dl className="mt-6 flex gap-10">
                {analysis.archetype.drivers.map((key) => (
                  <div key={key}>
                    <dt className="label">{READING_LABEL[key]}</dt>
                    <dd className="readout text-3xl">{readingValue(analysis.vitals, key)}</dd>
                  </div>
                ))}
              </dl>
              <p className="label mt-8">
                {analysis.parsed.tracks.length} tracks · {analysis.parsed.source}
              </p>
            </div>
            <HarmonicRings vitals={analysis.vitals} />
          </section>

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

          <VitalsPanel vitals={analysis.vitals} />
          <Tracklist tracks={analysis.parsed.tracks} />
        </>
      )}
    </main>
  );
}
