import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SaveImage } from '@/components/SaveImage';
import { SetSummary } from '@/components/SetSummary';
import { Tracklist } from '@/components/Tracklist';
import { parseRekordboxTxt } from '@/lib/parse/rekordbox';
import { computeVitals } from '@/lib/metrics/vitals';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { scoreAgainstBeatport } from '@/lib/beatport/match';
import { latestBeatportChart } from '@/lib/beatport/store';
import { findExample, formatPlayed } from '@/lib/examples';

async function readExample(id: string) {
  const example = findExample(id);
  if (!example) return null;
  const buf = await readFile(path.join(process.cwd(), 'public', 'demo', example.file));
  const parsed = parseRekordboxTxt(buf);
  return { example, parsed };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const read = await readExample(id);
  if (!read) return { title: 'Saber' };

  const { example, parsed } = read;
  const archetype = resolveArchetype(computeVitals(parsed.tracks));
  return {
    title: `${example.artist} — ${example.name} · Saber`,
    description: `${archetype.name}. ${archetype.blurb} ${parsed.tracks.length} tracks, ${formatPlayed(example.playedAt)}.`,
  };
}

/**
 * A permalink for one example, separate from the homepage picker. The point is
 * a URL someone can actually post: a DJ blog or a Discord message can link
 * straight to "Armin van Buuren's set on Saber" and have it unfurl as that,
 * rather than everyone landing on the generic homepage and hunting for it.
 *
 * Parses the same fixture file the homepage's example picker fetches, through
 * the same parser and metrics — an example reads exactly like a real drop
 * because it runs through identical code, not a precomputed shortcut.
 */
export default async function ExamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const read = await readExample(id);
  if (!read) notFound();

  const { example, parsed } = read;
  const vitals = computeVitals(parsed.tracks);
  const chart = await latestBeatportChart();
  const beatport = scoreAgainstBeatport(parsed.tracks, chart);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        <Link href="/" className="display text-6xl inline-block">
          Saber
        </Link>
        <p className="mt-2">{example.artist}</p>
        <p className="text-muted text-[13px]">{example.name}</p>
      </header>

      <SetSummary
        vitals={vitals}
        meta={`${parsed.tracks.length} tracks · ${formatPlayed(example.playedAt)}`}
        beatport={beatport}
        tracks={parsed.tracks}
      />

      <Tracklist tracks={parsed.tracks} />
      <SaveImage
        vitals={vitals}
        meta={`${parsed.tracks.length} tracks · ${formatPlayed(example.playedAt)}`}
        tracks={parsed.tracks}
      />

      <div>
        <Link href="/" className="btn-quiet">
          Drop your own track list
        </Link>
      </div>
    </main>
  );
}
