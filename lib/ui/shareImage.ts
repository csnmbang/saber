import { ringsDataUri } from './ringsSvg';
import { buildTempoTrace, curveSegments } from './tempoTrace';
import { camelotColor } from './colors';
import { parseCamelot } from '../parse/key';
import type { ParsedTrack } from '../parse/types';
import { resolveArchetype, type ReadingKey } from '../metrics/archetype';
import type { Vitals } from '../metrics/vitals';

export type ShareImageFormat = 'story' | 'square';

export const READING_LABEL: Record<ReadingKey, string> = {
  harmonic: 'HARMONIC',
  risk: 'RISK',
  range: 'RANGE',
  climb: 'CLIMB',
};

export function readingValue(vitals: Vitals, key: ReadingKey): string {
  if (key === 'climb') return vitals.climb === null ? '—' : vitals.climb.toFixed(2);
  const v = vitals[key];
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/** Measures and draws text: real in a browser or node-canvas, faked in a test that only checks geometry. */
export type TextMetricsCtx = {
  font: string;
  measureText: (text: string) => { width: number };
  fillText: (text: string, x: number, y: number) => void;
};

export const CANVAS_SIZE: Record<ShareImageFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

const PAD = 72;
const RINGS_SIZE: Record<ShareImageFormat, number> = { story: 1080 - PAD * 2, square: 460 };
const RINGS_GAP: Record<ShareImageFormat, number> = { story: 72, square: 48 };
const STATS_GAP: Record<ShareImageFormat, number> = { story: 96, square: 64 };
const STAT_COLUMN_GAP: Record<ShareImageFormat, number> = { story: 300, square: 260 };
const ARCH_SIZE: Record<ShareImageFormat, number> = { story: 96, square: 80 };
const BLURB_SIZE: Record<ShareImageFormat, number> = { story: 32, square: 26 };
/** How far below its own baseline a value's glyphs can still reach — descender-free digits and %, so this is generous, not exact. */
const VALUE_DESCENT_ALLOWANCE = 14;

export function wrapText(ctx: TextMetricsCtx, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Every vertical position on the card, computed once so the drawing code and
 * the tests read the same numbers. A canvas has no layout engine — nothing
 * stops one block's box from landing on top of the next unless the position is
 * derived from what actually got drawn above it, which is what this does:
 * each y comes from the real line count of the text before it, not an assumed
 * line count.
 */
export function layoutShareImage(
  ctx: TextMetricsCtx,
  vitals: Vitals,
  format: ShareImageFormat,
  fonts: { anton: string; mono: string },
) {
  const { w: W, h: H } = CANVAS_SIZE[format];
  const archetype = resolveArchetype(vitals);
  const availWidth = W - PAD * 2;

  let y = format === 'story' ? 148 : 96;
  y += format === 'story' ? 96 : 74; // kicker

  ctx.font = `400 ${ARCH_SIZE[format]}px ${fonts.anton}`;
  const archLines = wrapText(ctx, archetype.name.toUpperCase(), availWidth);
  const archBaselines = archLines.map(() => (y += ARCH_SIZE[format] * 0.98));

  y += format === 'story' ? 20 : 12;
  ctx.font = `400 ${BLURB_SIZE[format]}px ${fonts.mono}`;
  const blurbLines = wrapText(ctx, archetype.blurb, availWidth);
  const blurbBaselines = blurbLines.map(() => (y += BLURB_SIZE[format] * 1.35));

  const ringsY = y + RINGS_GAP[format];
  const ringsSize = RINGS_SIZE[format];
  const ringsBottom = ringsY + ringsSize;

  const statsY = ringsBottom + STATS_GAP[format];
  const valueBaseline = statsY + 58;

  const footerY = H - (format === 'story' ? 96 : 68);

  return {
    W,
    H,
    archetype,
    archLines,
    archBaselines,
    blurbLines,
    blurbBaselines,
    ringsX: format === 'story' ? PAD : (W - ringsSize) / 2,
    ringsY,
    ringsSize,
    statsY,
    statColumnGap: STAT_COLUMN_GAP[format],
    statX: format === 'story' ? PAD : (W - STAT_COLUMN_GAP[format]) / 2,
    valueBaseline,
    footerY,
    pad: PAD,
    /** True when the value text's lowest pixel still lands above the footer. */
    fits: valueBaseline + VALUE_DESCENT_ALLOWANCE < footerY,
  };
}

/** How faint the tempo curve sits behind the readings. */
const CURVE_ALPHA = 0.3;
const CURVE_WIDTH: Record<ShareImageFormat, number> = { story: 9, square: 7 };
/** Room left above the labels and below the footer so the curve is not clipped tight to either. */
const CURVE_HEADROOM = 74;

/**
 * The tempo curve as a horizon across the readings at the foot of the card:
 * full bleed edge to edge, dimmed, sweeping the band the numbers sit in.
 *
 * It carries the same reading as the curve on the page and the same colors,
 * but as ground rather than figure. Down here it fills space that was empty
 * anyway rather than competing with the rings, which stay the subject.
 */
function drawTempoHorizon(
  ctx: CanvasRenderingContext2D,
  tracks: ParsedTrack[],
  format: ShareImageFormat,
  layout: { W: number; statsY: number; footerY: number },
) {
  const trace = buildTempoTrace(tracks);
  if (!trace) return;

  const bandTop = layout.statsY - CURVE_HEADROOM;
  const bandHeight = Math.max(60, layout.footerY - CURVE_HEADROOM / 2 - bandTop);
  // Bleeds past both edges so it reads as a horizon rather than a chart.
  const overscan = layout.W * 0.06;
  const pixels = trace.points.map((p) => ({
    x: -overscan + p.x * (layout.W + overscan * 2),
    y: bandTop + (1 - p.y) * bandHeight,
  }));

  ctx.save();
  ctx.globalAlpha = CURVE_ALPHA;
  ctx.lineWidth = CURVE_WIDTH[format];
  ctx.lineCap = 'round';
  curveSegments(pixels).forEach((seg, i) => {
    const parsed = parseCamelot(trace.points[i].camelot);
    ctx.strokeStyle = parsed ? camelotColor(parsed.number, parsed.letter) : '#EDE7DB';
    ctx.beginPath();
    ctx.moveTo(seg.from.x, seg.from.y);
    ctx.bezierCurveTo(seg.c1.x, seg.c1.y, seg.c2.x, seg.c2.y, seg.to.x, seg.to.y);
    ctx.stroke();
  });
  ctx.restore();
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
 * A postable image of the reading, drawn to a real `<canvas>` and returned as a
 * PNG blob. Story is 1080×1920 for Instagram/TikTok Stories; square is
 * 1080×1080 for a feed post. Both draw the same rings SVG the page and the
 * share card use, so the picture matches what the DJ already saw.
 */
export async function renderShareImage(
  vitals: Vitals,
  format: ShareImageFormat,
  meta?: string,
  tracks?: ParsedTrack[],
): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('renderShareImage needs a browser.');
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE[format].w;
  canvas.height = CANVAS_SIZE[format].h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot render a canvas.');

  const fonts = { anton: cssFont('--font-anton'), mono: cssFont('--font-space-mono') };
  const CREAM = '#EDE7DB';
  const MUTED = '#8A8A8F';

  const layout = layoutShareImage(ctx, vitals, format, fonts);
  const { archetype, pad } = layout;

  ctx.fillStyle = '#0B0B0C';
  ctx.fillRect(0, 0, layout.W, layout.H);

  ctx.fillStyle = MUTED;
  ctx.font = `400 26px ${fonts.mono}`;
  ctx.fillText('S A B E R', pad, format === 'story' ? 148 : 96);

  ctx.fillStyle = CREAM;
  ctx.font = `400 ${ARCH_SIZE[format]}px ${fonts.anton}`;
  layout.archLines.forEach((line, i) => ctx.fillText(line, pad, layout.archBaselines[i]));

  ctx.fillStyle = MUTED;
  ctx.font = `400 ${BLURB_SIZE[format]}px ${fonts.mono}`;
  layout.blurbLines.forEach((line, i) => ctx.fillText(line, pad, layout.blurbBaselines[i]));

  const ringsImg = await loadImage(ringsDataUri(vitals));
  ctx.drawImage(ringsImg, layout.ringsX, layout.ringsY, layout.ringsSize, layout.ringsSize);

  // Under the readings at the foot of the card, drawn before them so the
  // numbers stay legible on top.
  if (tracks) drawTempoHorizon(ctx, tracks, format, layout);

  archetype.drivers.forEach((key, i) => {
    const x = layout.statX + i * layout.statColumnGap;
    ctx.fillStyle = MUTED;
    ctx.font = `400 22px ${fonts.mono}`;
    ctx.fillText(READING_LABEL[key], x, layout.statsY);
    ctx.fillStyle = CREAM;
    ctx.font = `400 52px ${fonts.mono}`;
    ctx.fillText(readingValue(vitals, key), x, layout.valueBaseline);
  });

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${fonts.mono}`;
  if (meta) ctx.fillText(meta.toUpperCase(), pad, layout.footerY);
  ctx.textAlign = 'right';
  ctx.fillText('SABER.ME', layout.W - pad, layout.footerY);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render the image.'))),
      'image/png',
    );
  });
}
