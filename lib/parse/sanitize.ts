import { toCamelot } from './key';
import type { ParsedTrack } from './types';

export const MAX_INCOMING_TRACKS = 600;

/**
 * The one place client-submitted tracks get trusted. Every server route that
 * receives a tracklist over the network — saving a set, scoring one against a
 * chart — runs it through here first and recomputes from the result, rather
 * than trusting numbers the client already claims to have derived.
 */
export function cleanIncomingTracks(raw: unknown): ParsedTrack[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_INCOMING_TRACKS) return null;

  const tracks: ParsedTrack[] = [];
  for (const item of raw) {
    if (typeof item?.title !== 'string' || !item.title.trim()) return null;
    const bpm = typeof item.bpm === 'number' && Number.isFinite(item.bpm) ? item.bpm : null;
    const durationS =
      typeof item.durationS === 'number' && Number.isFinite(item.durationS)
        ? Math.max(0, Math.trunc(item.durationS))
        : null;
    tracks.push({
      position: tracks.length + 1,
      title: item.title.slice(0, 300),
      artist: typeof item.artist === 'string' ? item.artist.slice(0, 300) : null,
      bpm: bpm !== null && bpm >= 20 && bpm <= 300 ? bpm : null,
      camelot: typeof item.camelot === 'string' ? toCamelot(item.camelot) : null,
      durationS,
      // Server routes don't need genre — nothing downstream of them reads it.
      genre: null,
    });
  }
  return tracks;
}
