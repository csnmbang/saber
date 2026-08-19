'use client';

import { useState } from 'react';
import { DropZone } from '@/components/DropZone';
import { Rings2D } from '@/components/Rings2D';
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
        setError(parsed.warnings[0] ?? 'No tracks found in that file.');
        setAnalysis(null);
        return;
      }
      const vitals = computeVitals(parsed.tracks);
      setAnalysis({ parsed, vitals, archetype: resolveArchetype(vitals) });
    } catch {
      setError('That file could not be read. Export it again from rekordbox as a .txt.');
      setAnalysis(null);
    }
  }

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        <h1 className="display text-6xl">Saber</h1>
        <p className="text-muted mt-2 max-w-xl">
          Drop your set history and see what you actually played — harmonic structure, tempo
          shape, and the archetype your mixing falls into.
        </p>
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
            <Rings2D vitals={analysis.vitals} />
          </section>

          {!analysis.parsed.hasEnoughKeys && (
            <section className="border border-line bg-surface p-5">
              <p className="label">Key data is missing</p>
              <p className="mt-2 text-[13px]">
                Only {Math.round(analysis.parsed.keyCoverage * 100)}% of these tracks carry a key,
                so the harmonic readings are left blank rather than guessed. The tempo and
                structure half below is unaffected.
              </p>
              <p className="mt-2 text-[13px] text-muted">
                To fix it for next time: select the tracks in rekordbox, right-click, and run
                Analyze. Then export the playlist again.
              </p>
            </section>
          )}

          <VitalsPanel vitals={analysis.vitals} />
          <Tracklist tracks={analysis.parsed.tracks} />

          <div>
            <button
              type="button"
              onClick={() => setAnalysis(null)}
              className="label border border-line px-4 py-2 hover:border-text hover:text-text"
            >
              Read another set
            </button>
          </div>
        </>
      )}

      <footer className="mt-auto pt-10 text-[12px] text-muted">
        Saber reads what you played. It does not score it.
        <br />
        Visuals adapted from the concepts in Kenichi Yoneda&apos;s Geom (CC BY-SA 4.0).
      </footer>
    </main>
  );
}
