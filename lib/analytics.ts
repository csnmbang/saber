import { track } from '@vercel/analytics';
import type { ParsedTrack } from './parse/types';

/**
 * The funnel worth having numbers on: how many visits turn into a reading, and
 * how many readings turn into a save, a share, or a publish. Every event here
 * is a count or a category — never a track title, artist, or anything that
 * could identify a specific set, so this stays true to the same rule the rest
 * of the app follows for tracklists.
 */
export function trackReadSet(props: {
  source: string;
  trackCount: number;
  hasEnoughKeys: boolean;
  genre: string | null;
}) {
  track('read_set', props);
}

/**
 * The genre that shows up most often in the set, exactly as rekordbox spelled
 * it — no taxonomy, no normalizing "Tech House" and "tech-house" together.
 * One category per read, not a track-by-track breakdown: a rare or personally
 * tagged genre string on a small set could narrow down who uploaded it, so
 * this stays one word for the whole set rather than a list.
 */
export function dominantGenre(tracks: ParsedTrack[]): string | null {
  const counts = new Map<string, number>();
  for (const track of tracks) {
    if (!track.genre) continue;
    counts.set(track.genre, (counts.get(track.genre) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [genre, count] of counts) {
    if (count > bestCount) {
      best = genre;
      bestCount = count;
    }
  }
  return best;
}

export function trackSaveSet(props: { source: string }) {
  track('save_set', props);
}

export function trackCopyShareLink() {
  track('copy_share_link');
}

export function trackSaveImage(props: { format: 'story' | 'square' }) {
  track('save_image', props);
}

export function trackPublish(props: { isPublic: boolean }) {
  track('publish_set', props);
}
