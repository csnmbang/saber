/**
 * Text normalization for matching a DJ's own track titles against Beatport's.
 * The same problem scene-radar's normalize.py solves for artist names — two
 * sources spell the same thing differently — extended here to track titles,
 * which rekordbox and Beatport split apart differently: rekordbox folds the
 * mix name into the title ("Vivenza (Original Mix)"), Beatport keeps it in
 * its own field. splitMixName undoes that fold so both sides compare the same
 * shape: a bare title plus an optional mix name.
 */

const MIX_SUFFIX = /\s*[\(\[]([^()[\]]*(?:mix|edit|remix|version|dub|vip|bootleg)[^()[\]]*)[\)\]]\s*$/i;

export function splitMixName(title: string): { title: string; mix: string | null } {
  const match = MIX_SUFFIX.exec(title);
  if (!match) return { title: title.trim(), mix: null };
  return { title: title.slice(0, match.index).trim(), mix: match[1].trim() };
}

/** lowercase, strip diacritics and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A rekordbox artist cell is often "A, B" for a collab — split it into names. */
export function splitArtists(artist: string): string[] {
  // No \b after the optional dot: "feat." ends on a period, and a period is
  // itself a non-word character, so a word-boundary assertion right after it
  // never matches — the leading \b already anchors "feat"/"ft" correctly.
  return artist
    .split(/,|\bfeat\.?|\bft\.?|\bx\b|&/i)
    .map((a) => a.trim())
    .filter(Boolean);
}
