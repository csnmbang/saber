import { ringsDataUri } from './ringsSvg';
import { archetypeById, type ArchetypeId } from '../metrics/archetype';
import type { Vitals } from '../metrics/vitals';

/**
 * The profile as one postable picture: a wall of ring tiles.
 *
 * The single-set card says what one night was. This says what a DJ's sets look
 * like next to each other, which is the thing worth posting more than once —
 * every set's rings are a different shape, and that only reads when several
 * sit together.
 */

export type ProfileTile = {
  vitals: Vitals;
  archetype: string;
  createdAt: string;
};

export const PROFILE_SIZE = { w: 1080, h: 1920 };

/** Beyond this the tiles get too small to tell apart, which defeats the point. */
export const MAX_TILES = 6;

const PAD = 72;
const GAP = 40;
const GRID_TOP = 300;
const RING_SIZE = 372;
const ROW_H = 496;

export type ProfileLayout = ReturnType<typeof layoutProfileImage>;

/**
 * Tile positions, computed once so the drawing code and the tests read the
 * same numbers. One column for a single set, two for anything more — a lone
 * tile in a two-column grid reads as a layout mistake rather than a choice.
 */
export function layoutProfileImage(tileCount: number) {
  const shown = Math.min(tileCount, MAX_TILES);
  const cols = shown === 1 ? 1 : 2;
  const rows = Math.ceil(shown / cols);
  const cellW = (PROFILE_SIZE.w - PAD * 2 - GAP * (cols - 1)) / cols;
  const ringSize = cols === 1 ? Math.min(cellW, RING_SIZE * 1.4) : RING_SIZE;

  const tiles = Array.from({ length: shown }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = PAD + col * (cellW + GAP);
    const top = GRID_TOP + row * ROW_H;
    return {
      cellX,
      cellW,
      ringX: cellX + (cellW - ringSize) / 2,
      ringY: top,
      ringSize,
      /** Baselines for the archetype name and the date under it. */
      nameBaseline: top + ringSize + 52,
      dateBaseline: top + ringSize + 86,
    };
  });

  return {
    ...PROFILE_SIZE,
    shown,
    cols,
    rows,
    tiles,
    pad: PAD,
    kickerY: 148,
    titleBaseline: 236,
    footerY: PROFILE_SIZE.h - 96,
    /** True when the last row's date still lands clear of the footer. */
    fits: (tiles.at(-1)?.dateBaseline ?? 0) < PROFILE_SIZE.h - 140,
  };
}

function cssFont(varName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || 'sans-serif';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the rings.'));
    img.src = src;
  });
}

/**
 * Draw the wall and return it as a PNG blob. Newest sets first — the same
 * order the profile page shows them in, so the picture matches the page.
 */
export async function renderProfileImage(tiles: ProfileTile[]): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('renderProfileImage needs a browser.');
  await document.fonts.ready;

  const layout = layoutProfileImage(tiles.length);
  const canvas = document.createElement('canvas');
  canvas.width = layout.w;
  canvas.height = layout.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot render a canvas.');

  const fonts = { anton: cssFont('--font-anton'), mono: cssFont('--font-space-mono') };
  const CREAM = '#EDE7DB';
  const MUTED = '#8A8A8F';

  ctx.fillStyle = '#0B0B0C';
  ctx.fillRect(0, 0, layout.w, layout.h);

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px ${fonts.mono}`;
  ctx.fillText('S A B E R', layout.pad, layout.kickerY);

  ctx.fillStyle = CREAM;
  ctx.font = `400 84px ${fonts.anton}`;
  ctx.fillText('MY SETS', layout.pad, layout.titleBaseline);

  const shown = tiles.slice(0, layout.shown);
  const images = await Promise.all(shown.map((tile) => loadImage(ringsDataUri(tile.vitals))));

  shown.forEach((tile, i) => {
    const box = layout.tiles[i];
    ctx.drawImage(images[i], box.ringX, box.ringY, box.ringSize, box.ringSize);

    const name = archetypeById(tile.archetype as ArchetypeId)?.name ?? tile.archetype;
    ctx.fillStyle = CREAM;
    ctx.font = `400 ${layout.cols === 1 ? 46 : 34}px ${fonts.anton}`;
    ctx.fillText(name.toUpperCase(), box.cellX, box.nameBaseline);

    ctx.fillStyle = MUTED;
    ctx.font = `400 ${layout.cols === 1 ? 24 : 20}px ${fonts.mono}`;
    const date = new Date(tile.createdAt)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      .toUpperCase();
    ctx.fillText(date, box.cellX, box.dateBaseline);
  });

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${fonts.mono}`;
  // Says "6 OF 11" rather than "6" when there are more than fit, so the
  // picture never implies a smaller collection than there is.
  const count =
    tiles.length > layout.shown
      ? `${layout.shown} OF ${tiles.length} SETS`
      : `${tiles.length} ${tiles.length === 1 ? 'SET' : 'SETS'}`;
  ctx.fillText(count, layout.pad, layout.footerY);
  ctx.textAlign = 'right';
  ctx.fillText('SABER.ME', layout.w - layout.pad, layout.footerY);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image.'))),
      'image/png',
    );
  });
}
