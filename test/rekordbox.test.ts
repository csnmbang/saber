import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRekordboxTxt, toSeconds } from '@/lib/parse/rekordbox';

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, 'fixtures/rekordbox', name));

describe('parseRekordboxTxt — real export', () => {
  const result = parseRekordboxTxt(fixture('euro-problem.txt'));

  it('reads UTF-16LE and strips the BOM', () => {
    expect(result.tracks).toHaveLength(10);
    expect(result.tracks[0].title).toBe('Vivenza (Original Mix)');
    expect(result.tracks[0].title.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('matches columns by header name, not index', () => {
    expect(result.columns).toMatchObject({
      title: 'Track Title',
      artist: 'Artist',
      bpm: 'BPM',
      key: 'Key',
      time: 'Time',
    });
  });

  it('parses the fields off a real row', () => {
    expect(result.tracks[1]).toEqual({
      position: 2,
      title: 'Fernet (Original Mix)',
      artist: 'Del Fonda',
      bpm: 122,
      camelot: '3A',
      durationS: 8 * 60 + 25,
    });
  });

  it('keeps non-ascii artist names intact', () => {
    expect(result.tracks[9].artist).toBe('Soulwax, Bolis Pupul, Charlotte Adigéry');
    expect(result.tracks[6].title).toContain('Cuánto Cuesta');
  });

  it('renumbers positions from 1 in play order', () => {
    expect(result.tracks.map((t) => t.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('has full key coverage', () => {
    expect(result.keyCoverage).toBe(1);
    expect(result.hasEnoughKeys).toBe(true);
  });
});

describe('parseRekordboxTxt — notation variants', () => {
  it('normalizes Open Key to Camelot and leaves blanks null', () => {
    const result = parseRekordboxTxt(fixture('open-key.txt'));
    expect(result.tracks.map((t) => t.camelot)).toEqual(['8A', '3B', null, '9A']);
    expect(result.keyCoverage).toBeCloseTo(0.75);
    expect(result.hasEnoughKeys).toBe(true);
  });

  it('falls back to content inference when headers are in another language', () => {
    const result = parseRekordboxTxt(fixture('classical-de.txt'));
    expect(result.tracks).toHaveLength(3);
    expect(result.columns).toMatchObject({ key: 'Tonart', bpm: 'Tempo', time: 'Dauer' });
    expect(result.tracks.map((t) => t.camelot)).toEqual(['8A', '8B', '11A']);
    expect(result.tracks[0].title).toBe('Eins');
    expect(result.tracks[0].artist).toBe('Ein Kuenstler');
    expect(result.tracks[0].bpm).toBe(120);
  });
});

describe('parseRekordboxTxt — missing key data', () => {
  it('reports sparse keys instead of interpolating them', () => {
    const result = parseRekordboxTxt(fixture('no-keys.txt'));
    expect(result.keyCoverage).toBeCloseTo(0.2);
    expect(result.hasEnoughKeys).toBe(false);
    // The BPM half of the analysis still survives.
    expect(result.tracks.every((t) => t.bpm !== null)).toBe(true);
    expect(result.tracks.filter((t) => t.camelot !== null)).toHaveLength(1);
  });
});

describe('parseRekordboxTxt — bad input', () => {
  it('says what happened on an empty file', () => {
    const result = parseRekordboxTxt('');
    expect(result.tracks).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/empty/i);
  });

  it('says what happened when there are no track rows', () => {
    const result = parseRekordboxTxt('#\tTrack Title\tArtist\n');
    expect(result.tracks).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/Export a playlist/);
  });

  it('warns when decoding something that is not UTF-16', () => {
    const utf8 = Buffer.from(
      '#\tTrack Title\tArtist\tBPM\tKey\tTime\n1\tA\tB\t120.00\t8A\t06:00\n',
      'utf8',
    );
    const result = parseRekordboxTxt(utf8);
    expect(result.warnings.some((w) => /UTF-8/.test(w))).toBe(true);
    expect(result.tracks).toHaveLength(1);
  });
});

describe('toSeconds', () => {
  it('parses mm:ss and h:mm:ss', () => {
    expect(toSeconds('06:03')).toBe(363);
    expect(toSeconds('1:02:03')).toBe(3723);
    expect(toSeconds('nope')).toBeNull();
  });
});
