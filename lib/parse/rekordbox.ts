/**
 * rekordbox playlist / history export parser.
 *
 * File > Export a playlist to a file (*.txt). The format is UTF-16LE with a
 * BOM, tab-delimited, first row headers. Header names move around between
 * rekordbox versions and language settings, so columns are matched by fuzzy
 * header name and — when the header is in a language we do not recognize — by
 * what the column actually contains.
 */
import { toCamelot } from './key';
import { MIN_KEY_COVERAGE, type ParseResult, type ParsedTrack, type TrackField } from './types';

/** Header aliases we recognize outright, normalized (lowercase, alphanumeric only). */
const HEADER_ALIASES: Record<TrackField, string[]> = {
  position: ['#', 'no', 'nr', 'num', 'number', 'index', 'order'],
  title: ['tracktitle', 'title', 'trackname', 'name', 'song'],
  artist: ['artist', 'artists', 'trackartist'],
  bpm: ['bpm', 'tempo'],
  key: ['key', 'initialkey', 'tonality', 'musicalkey'],
  time: ['time', 'tracktime', 'duration', 'length', 'totaltime'],
};

function normalizeHeader(h: string): string {
  return h
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#]/g, '');
}

/** Decode an uploaded export. rekordbox writes UTF-16LE + BOM; be explicit about anything else. */
export function decodeExport(input: ArrayBuffer | Uint8Array | string): {
  text: string;
  warnings: string[];
} {
  if (typeof input === 'string') return { text: stripBom(input), warnings: [] };

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const warnings: string[] = [];

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: stripBom(new TextDecoder('utf-16le').decode(bytes)), warnings };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    warnings.push('File is UTF-16BE. rekordbox normally writes UTF-16LE — decoded as big-endian.');
    return { text: stripBom(new TextDecoder('utf-16be').decode(bytes)), warnings };
  }

  // No BOM. UTF-16LE ASCII text has a null in every other byte.
  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  let oddNulls = 0;
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0) oddNulls++;
  if (sample.length > 8 && oddNulls / Math.floor(sample.length / 2) > 0.8) {
    warnings.push('File is UTF-16LE without a BOM — decoded as UTF-16LE.');
    return { text: stripBom(new TextDecoder('utf-16le').decode(bytes)), warnings };
  }

  warnings.push('File is not UTF-16 — decoded as UTF-8.');
  return { text: stripBom(new TextDecoder('utf-8').decode(bytes)), warnings };
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function toNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** 'mm:ss' or 'h:mm:ss' -> seconds. */
export function toSeconds(raw: string): number | null {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/.exec(raw.trim());
  if (!m) return null;
  const [, h, mm, ss] = m;
  return (h ? Number(h) * 3600 : 0) + Number(mm) * 60 + Number(ss);
}

function looksLikeBpm(v: string): boolean {
  const n = toNumber(v);
  return n !== null && n >= 50 && n <= 250;
}

/** Share of non-empty cells in a column that satisfy a predicate. */
function columnHitRate(rows: string[][], index: number, test: (v: string) => boolean): number {
  let seen = 0;
  let hit = 0;
  for (const row of rows) {
    const v = (row[index] ?? '').trim();
    if (!v) continue;
    seen++;
    if (test(v)) hit++;
  }
  return seen === 0 ? 0 : hit / seen;
}

/**
 * Map export columns to track fields. Headers first; whatever is still missing
 * is inferred from cell contents, so a Japanese or German export still parses.
 */
function mapColumns(headers: string[], rows: string[][]) {
  const mapping: Partial<Record<TrackField, number>> = {};
  const taken = new Set<number>();
  const normalized = headers.map(normalizeHeader);

  for (const field of Object.keys(HEADER_ALIASES) as TrackField[]) {
    const aliases = HEADER_ALIASES[field];
    const index = normalized.findIndex((h, i) => !taken.has(i) && aliases.includes(h));
    if (index >= 0) {
      mapping[field] = index;
      taken.add(index);
    }
  }

  const free = headers.map((_, i) => i).filter((i) => !taken.has(i));
  const claim = (field: TrackField, index: number) => {
    mapping[field] = index;
    taken.add(index);
    free.splice(free.indexOf(index), 1);
  };

  if (mapping.key === undefined) {
    const found = free.find((i) => columnHitRate(rows, i, (v) => toCamelot(v) !== null) >= 0.6);
    if (found !== undefined) claim('key', found);
  }
  if (mapping.bpm === undefined) {
    const found = free.find((i) => columnHitRate(rows, i, looksLikeBpm) >= 0.6);
    if (found !== undefined) claim('bpm', found);
  }
  if (mapping.time === undefined) {
    const found = free.find((i) => columnHitRate(rows, i, (v) => toSeconds(v) !== null) >= 0.6);
    if (found !== undefined) claim('time', found);
  }
  if (mapping.position === undefined) {
    const found = free.find((i) => columnHitRate(rows, i, (v) => /^\d+$/.test(v)) >= 0.9);
    if (found !== undefined) claim('position', found);
  }
  // Text columns left over: the first is the title, the next is the artist.
  const textual = free.filter((i) => columnHitRate(rows, i, (v) => v.length > 0) >= 0.5);
  if (mapping.title === undefined && textual.length) claim('title', textual[0]);
  if (mapping.artist === undefined) {
    const rest = textual.filter((i) => taken.has(i) === false);
    if (rest.length) claim('artist', rest[0]);
  }

  return mapping;
}

export function parseRekordboxTxt(input: ArrayBuffer | Uint8Array | string): ParseResult {
  const { text, warnings } = decodeExport(input);

  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return emptyResult(['The file is empty.', ...warnings]);
  }

  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split('\t'));
  if (headers.length < 2 || rows.length === 0) {
    return emptyResult([
      'No track rows found. Export with File > Export a playlist to a file (*.txt).',
      ...warnings,
    ]);
  }

  const mapping = mapColumns(headers, rows);
  if (mapping.title === undefined) {
    return emptyResult(['Could not find a track title column in this export.', ...warnings]);
  }

  const cell = (row: string[], field: TrackField): string =>
    mapping[field] === undefined ? '' : (row[mapping[field]!] ?? '').trim();

  const tracks: ParsedTrack[] = [];
  let skipped = 0;
  for (const row of rows) {
    const title = cell(row, 'title');
    if (!title) {
      skipped++;
      continue;
    }
    const artist = cell(row, 'artist');
    const bpm = toNumber(cell(row, 'bpm'));
    const durationS = toSeconds(cell(row, 'time'));
    tracks.push({
      position: tracks.length + 1,
      title,
      artist: artist || null,
      bpm: bpm !== null && bpm >= 20 && bpm <= 300 ? bpm : null,
      camelot: toCamelot(cell(row, 'key')),
      durationS,
    });
  }

  if (skipped > 0) warnings.push(`Skipped ${skipped} row(s) with no track title.`);
  if (mapping.key === undefined) warnings.push('This export has no key column.');
  if (mapping.bpm === undefined) warnings.push('This export has no BPM column.');

  const keyed = tracks.filter((t) => t.camelot !== null).length;
  const keyCoverage = tracks.length === 0 ? 0 : keyed / tracks.length;

  const columns: Partial<Record<TrackField, string>> = {};
  for (const [field, index] of Object.entries(mapping) as [TrackField, number][]) {
    columns[field] = headers[index];
  }

  return {
    source: 'rekordbox',
    tracks,
    keyCoverage,
    hasEnoughKeys: keyCoverage >= MIN_KEY_COVERAGE,
    columns,
    warnings,
  };
}

function emptyResult(warnings: string[]): ParseResult {
  return {
    source: 'rekordbox',
    tracks: [],
    keyCoverage: 0,
    hasEnoughKeys: false,
    columns: {},
    warnings,
  };
}
