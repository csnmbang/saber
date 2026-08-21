/**
 * Sets anyone can look at without owning a rekordbox export.
 *
 * Each one is a published tracklist with tempo and key looked up per track on
 * Beatport, not an export anybody made — see test/fixtures/rekordbox/README.md
 * for exactly how they were built. `file` is the .txt in public/demo, read the
 * same way a real upload is: parsed, never pre-computed, so an example and a
 * real drop run through identical code.
 */
export type Example = {
  id: string;
  file: string;
  artist: string;
  name: string;
  playedAt: string;
};

export const EXAMPLES: Example[] = [
  {
    id: 'purple-disco-tales-2026-08',
    file: 'purple-disco-tales-2026-08.txt',
    artist: 'Purple Disco Machine',
    name: 'Purple Disco Tales August',
    playedAt: '2026-08-20',
  },
  {
    id: 'global-dance-hq-2026-08-14',
    file: 'global-dance-hq-2026-08-14.txt',
    artist: 'Pete Tong, Michael Bibi, Tini Gessler',
    name: 'Global Dance HQ',
    playedAt: '2026-08-14',
  },
  {
    id: 'asot-ibiza-2026',
    file: 'asot-ibiza-2026.txt',
    artist: 'Armin van Buuren',
    name: 'A State Of Trance Ibiza 2026',
    playedAt: '2026-08-06',
  },
];

export function findExample(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}

export function formatPlayed(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
