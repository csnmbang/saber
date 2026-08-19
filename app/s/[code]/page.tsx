import Link from 'next/link';
import type { Metadata } from 'next';
import { SaveImage } from '@/components/SaveImage';
import { SetSummary } from '@/components/SetSummary';
import { resolveArchetype } from '@/lib/metrics/archetype';
import { decodeShare } from '@/lib/share';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const vitals = decodeShare(code);
  if (!vitals) return { title: 'Saber' };

  const archetype = resolveArchetype(vitals);
  const tempo = vitals.components.bpm ? `, ${vitals.components.bpm.mean.toFixed(0)} bpm` : '';
  return {
    title: `${archetype.name} · Saber`,
    description: `${vitals.trackCount} tracks${tempo}. ${archetype.blurb}`,
  };
}

export default async function SharedSet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const vitals = decodeShare(code);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col gap-12">
      <header>
        <Link href="/" className="display text-6xl inline-block">
          Saber
        </Link>
        <p className="text-muted mt-2">Drop your track list. See what you played.</p>
      </header>

      {vitals ? (
        <>
          <SetSummary vitals={vitals} meta={`${vitals.trackCount} tracks`} />
          <SaveImage vitals={vitals} meta={`${vitals.trackCount} tracks`} />
          <div>
            <Link
              href="/"
              className="label border border-line px-4 py-2 hover:border-text hover:text-text"
            >
              Read your own set
            </Link>
          </div>
        </>
      ) : (
        <section>
          <p>That link is incomplete, so there is nothing to read from it.</p>
          <p className="text-muted mt-2 text-[13px]">
            Ask whoever sent it for the full link, or drop your own export.
          </p>
          <Link
            href="/"
            className="label mt-6 inline-block border border-line px-4 py-2 hover:border-text hover:text-text"
          >
            Drop a track list
          </Link>
        </section>
      )}
    </main>
  );
}
